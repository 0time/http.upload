const Promise = require('bluebird');
const fse = require('fs-extra');
const path = require('path');
const tar = require('tar');

const config = require('../config');
const {mkdir_p} = require('../lib/fs');
const {ensureResponse, formidablePromise, logAndReject, logForm, logRequest} = require('../lib/http');

module.exports = [
  {
    method: 'post',
    route: '/deploy',
    cb: (req, res) => Promise.resolve(req)
      .tap(logRequest)
      .then(() => formidablePromise(req))
      .tap(logForm)
      .then(formData => Object.assign({
        relativePath: path.join(formData.fields.context, formData.fields.version, formData.fields.checksum),
        deploymentPath: path.resolve(config.deploymentDir, formData.fields.context, formData.fields.version, formData.fields.checksum),
      }, formData))
      .tap(({deploymentPath, fields, files}) =>
        mkdir_p(deploymentPath))
      .tap(({deploymentPath, files}) =>
        tar.x({
          cwd: deploymentPath,
          file: files.file.path,
        }))
      .tap(({files}) => fse.unlink(files.file.path))
      .then(result => Object.assign({
        permalink: `https://phaser.0ti.me/deployments/${result.relativePath}/`,
      }, result))
      .then(({fields, permalink}) => res.status(200).send({fields, permalink}))
      .catch(console.error)
      .tap(ensureResponse(res))
  }
];
