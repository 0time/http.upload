const Promise = require('bluebird');
const config = require('../config');
const formidable = require('formidable');
const fse = require('fs-extra');
const path = require('path');
const sha256 = require('sha256');

const {mkdir_p} = require('../lib/fs');
const {ensureResponse, formidablePromise, logAndReject, logForm, logRequest} = require('../lib/http');

module.exports = [
  {
    method: 'post',
    route: '/upload',
    cb: (req, res) => Promise.resolve(req)
      .tap(logRequest)
      .then(formidablePromise)
      .tap(logForm)
      .tap(({fields: {checksum}, files}) => fse.readFile(files.file.path).then(fileContents => {
        const computed = sha256(fileContents);

        if (computed !== checksum) {
          throw new Error(`checksums [${computed}, ${checksum}] did not match`);
        }
      }))
      .tap(({fields}) =>
        mkdir_p(path.dirname(path.resolve(config.uploadDir, fields.file_path))))
      .then(({fields, files}) => ({
        oldFile: files.file.path,
        newFile: path.resolve(config.uploadDir, req.query.context, fields.file_path),
      }))
      .tap(({oldFile, newFile}) => fse.rename(oldFile, newFile))
      .then(({newFile}) => ({
        body: {message: `Wrote ${newFile.replace(config.uploadDir, '')} to disk`},
        statusCode: 200,
      }))
      .then(({body, statusCode}) => res.status(statusCode).send(body))
      .catch(console.error)
      .tap(ensureResponse(res)),
  }
];
