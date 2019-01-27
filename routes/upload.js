const Promise = require('bluebird');
const config = require('../config');
const formidable = require('formidable');
const fse = require('fs-extra');
const path = require('path');
const sha256 = require('sha256');

const {mkdir_p} = require('../lib/fs');
const {ensureResponse, logAndReject} = require('../lib/http');

module.exports = [
  {
    method: 'post',
    route: '/upload',
    cb: (req, res) => new Promise((resolve, reject) => {
      const form = new formidable.IncomingForm();

      form.on(
        'fileBegin',
        (name, file) =>
          (file.path = path.resolve(config.uploadDir, file.name)),
      );

      form.on('file', (name, file) =>
        console.error(`Uploaded ${file.name}`),
      );

      return form.parse(req, (err, fields, files) =>
        err
          ? reject(err)
          : resolve({
              fields,
              files,
            }),
      );
    })
      .tap(console.error)
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
        newFile: path.resolve(config.uploadDir, fields.file_path),
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
