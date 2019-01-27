const Promise = require('bluebird');
const fse = require('fs-extra');
const path = require('path');
const sha256 = require('sha256');

const config = require('../config');
const {ensureResponse, logRequest} = require('../lib/http');

const checksumMap = {
  sha256
};

const validateChecksum = ({query}) =>
  Promise.resolve(query)
    .then(accumulator => Promise.props(Object.assign({
      fileContents: fse.readFile(path.resolve(config.uploadDir, accumulator.file))
    }, accumulator)))
    .then(accumulator => Object.assign({
      computed: sha256(accumulator.fileContents),
    }, accumulator))
    .then(accumulator => Object.assign({
      match: accumulator.checksum === accumulator.computed
    }, accumulator))
    .catch(err => (err.message.startsWith('ENOENT: no such file or directory')
      ? false
      : Promise.reject(err)));


module.exports = [
  {
    method: 'get',
    route: '/check',
    cb: (req, res) =>
      Promise.resolve(req)
        .tap(logRequest)
        .then(validateChecksum)
        .then(({checksum, computed, match}) => ({body: {checksum, computed, match}, statusCode: 200}))
        .tap(console.error)
        .then(({body, statusCode}) => res.status(statusCode).send(body))
        .catch(console.error)
        .tap(ensureResponse(res)),
  }
];
