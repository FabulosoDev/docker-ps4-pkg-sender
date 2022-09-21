FROM node:16.17-alpine

RUN apk --no-cache add curl

WORKDIR /opt/apps/pkg_sender

COPY package.json package.json
RUN npm install

COPY src src

CMD ["npm", "start"]