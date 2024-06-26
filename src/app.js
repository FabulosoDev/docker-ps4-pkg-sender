const express = require('express');
const morgan = require('morgan');
const mustache_express = require('mustache-express');
const path = require('path');
const fs = require('fs');
const filesize = require('filesize');
const crypto = require('crypto');
const { exec } = require('child_process');

const port = process.env.PORT ?? 7777;
const static_files_path = process.env.STATIC_FILES ?? './files';
const ps4_ip = process.env.PS4IP ?? 'localhost';
const local_ip = process.env.LOCALIP ?? 'localhost';

const app = express();

app.use('/css', express.static(path.join(__dirname, '../node_modules/@fortawesome/fontawesome-free/css')));
app.use('/webfonts', express.static(path.join(__dirname, '../node_modules/@fortawesome/fontawesome-free/webfonts')));
app.use('/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '../node_modules/jquery/dist')));

app.use('/css', express.static(path.join(__dirname, '/views/css')));

app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true }));

app.engine('html', mustache_express());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.get('/', function (req, res) {
  var dirs = flatten_pkgs(get_pkgs());
  res.render('index', {"dirs": dirs});
});
app.post('/install', function(req, res) {
  const filepath = req.body.filepath;

  const dirname = path.dirname(filepath);
  app.use(express.static(dirname));
  const filename = path.basename(filepath);
  ps4_install(filename, res);
});

app.listen(port, function () {
  console.log(`PS4 PKG sender listening on port ${port} serving files from ${static_files_path}`);
});

function flatten_pkgs() {
  const pkgs = get_pkgs();
  var flattend = [];
  Object.keys(pkgs).forEach(function(root) {
    flattend.push({id: crypto.randomUUID(), root:root, pkgs: pkgs[root]})
  });
  return flattend;
}

function get_pkgs() {
  const walkSync = function(dir, filelist) {
    const files = fs.readdirSync(dir);
    files.forEach(function(file) {
      filepath = dir + '/' + file;
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        filelist = walkSync(filepath, filelist);
      } else if (path.extname(file).toLowerCase() === '.pkg') {
        let dirname = path.dirname(filepath).replace(static_files_path + '/', '')
        let root = dirname.split("/", 1)[0];
        if (!filelist[root])
          filelist[root] = [];
        filelist[root].push({
          filepath: filepath,
          dir: dirname.replace(root + '/', ''),
          name: path.basename(filepath),
          size: filesize(stat.size)
        });
      }
    });
    return filelist;
  };
  return walkSync(static_files_path, {});
}

function ps4_install(filename, res) {
  const pkg_uri = `http://${local_ip}:${port}/${encodeURI(filename)}`;
  const ps4_api_uri = `http://${ps4_ip}:12800/api/install`;
  const curl_command = `curl -v "${ps4_api_uri}" --data '{"type":"direct","packages":["${pkg_uri}"]}'`;
  res.write(curl_command);
  console.log(curl_command);
  exec(curl_command, (err, stdout, stderr) => {
    if (err) {
      res.write(`\n`);
      res.end(`error: ${JSON.stringify(err)}`);
      console.error(err);
      return;
    }
    res.write(`stdout: ${stdout}`);
    console.log(`stdout: ${stdout}`);
    res.write(`stderr: ${stderr}`);
    console.log(`stderr: ${stderr}`);
    res.end();
  });
}
