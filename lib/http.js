const Promise = require('bluebird');
const formidable = require('formidable');
const path = require('path');

const config = require('../config');

const ensureResponse = res => inp => {
  if (!res.headersSent) {
    res.sendStatus(500);
  }

  return inp;
};

const formidablePromise = req =>
  new Promise((resolve, reject) => {
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
  });

const logAndReject = message => {
  console.error(message);

  return Promise.reject(message);
};

const logForm = obj => {
  const {fields, files} = obj;

  console.error({
    fields,
    files,
  });

  return obj;
};

const logRequest = req => {
  console.error({
    body: req.body,
    path: req.path,
    query: req.query,
  });

  return req;
};

module.exports = {
  ensureResponse,
  formidablePromise,
  logAndReject,
  logRequest,
};
