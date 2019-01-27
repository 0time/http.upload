const Promise = require('bluebird');

const express = require('express');
const app = express();
const sha256 = require('sha256');

const authorizedIpMiddleware = require('./lib/authorized_ip_middleware');
const config = require('./config');
const {mkdir_p} = require('./lib/fs');

const {env} = process;

// routes
const routeSets = [
  require('./routes/tgz'),
  require('./routes/check'),
  require('./routes/upload'),
];

routeSets.forEach(routeSet => routeSet.forEach(({cb, method, route}) =>
  app[method](route, cb)));

app.set('etag', (body, encoding) => {
  const etag = sha256(body);

  console.error(etag);

  return etag;
});

app.use(authorizedIpMiddleware)

mkdir_p(config.uploadDir)
  .catch(console.error);

app.listen(env.PORT || config.port || 3000, err => {
  if (err) {
    console.error(err);
  }
});
