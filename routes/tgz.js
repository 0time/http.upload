const Promise = require('bluebird');
const fse = require('fs-extra');
const os = require('os');
const path = require('path');
const sha256 = require('sha256');
const tar = require('tar');

const config = require('../config');

const {ensureResponse} = require('../lib/http');

const targz = 'http.upload.tar.gz';
const headers = {
  'Content-Encoding': 'gzip',
  'Content-Type': 'application/tar+gzip',
  'x-etag-fn': 'sha256',
};

module.exports = [
  {
    method: 'get',
    route: '/tgz',
    cb: (req, res) =>
      Promise.resolve()
        .then(() => console.error({
          query: req.query
        }))
        .then(() => fse.mkdtemp(path.resolve(os.tmpdir(), 'http.upload.')))
        .then(folder => ({
          file: path.resolve(folder, targz),
          folder,
          paths: req.query.paths.split(','),
        }))
        .tap(x => console.error(Object.assign({line: 34}, x)))
        .tap(({file, folder, paths}) =>
          tar.c(
            {
              gzip: true,
              C: path.join(config.uploadDir, req.query.context),
              file,
            },
            paths
          ),
        )
        .then(({file, folder}) => Promise.props({
          file,
          fileContents: fse.readFile(file),
          folder,
        }))
        .tap(() => Object.keys(headers).forEach(key =>
          res.set(key, headers[key])))
        .tap(({fileContents}) =>
          res.set('etag', sha256(fileContents)))
        .tap(({fileContents}) =>
          res.set('x-file-length', fileContents.length))
        .tap(({fileContents}) =>
          res.send(fileContents))
        .tap(({file, fileContents}) =>
          req.fresh
            ? console.error(`Sent 304`)
            : console.error(`Sent ${file} (len: ${fileContents.length}) to client`))
        .tap(({file}) => {
          if (config.removeFiles) {
            fse.unlink(file)
          }
        })
        .tap(({folder}) => {
          if (config.removeFiles) {
            fse.rmdir(folder)
          }
        })
        .catch(console.error)
        .tap(ensureResponse(res)),
  }
];
