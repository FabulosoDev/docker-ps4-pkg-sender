FROM node:16.17-alpine

WORKDIR /opt/apps/pkg_sender

COPY package.json package.json
RUN npm install

COPY src src

CMD ["npm", "start"]