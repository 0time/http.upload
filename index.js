const Network = require('cidr-grep/lib/network');
const Promise = require('bluebird');

const express = require('express');
const app = express();
const formidable = require('formidable');
const fse = require('fs-extra');
const os = require('os');
const path = require('path');
const sha256 = require('sha256');
const tar = require('tar');

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

const cidrCheck = (cidr, ip) => Network.create(cidr).contains(ip);

app.use((req, res, next) => {
  //const ip = req.connection.remoteAddress;
  //const ip = req.connection.remoteAddress.replace(/^::ffff:/, '');
  console.error(req.headers);

  const ip = req.header('X-Forwarded-For') || req.connection.remoteAddress;

  const authorized = config.authorized.reduce(
    (acc, cidr) => (acc ? acc : cidrCheck(cidr, ip)),
    false,
  );

  if (authorized) {
    next();
  } else {
    const response = {
      message: 'Unauthorized',
      ip,
    };

    console.error(response);

    res.status(401).send(response);
  }
});

mkdir_p(config.uploadDir)
  .catch(console.error);

app.listen(env.PORT || config.port || 3000, err => {
  if (err) {
    console.error(err);
  }
});
