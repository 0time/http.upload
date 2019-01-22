const {env} = process;
const express = require('express');
const app = express();
const formidable = require('formidable');
const fse = require('fs-extra');
const os = require('os');
const path = require('path');
const tar = require('tar');
const Promise = require('bluebird');

const config = require('./config');
const Network = require('cidr-grep/lib/network');

const cidrCheck = (cidr, ip) => Network.create(cidr).contains(ip);

const mkdir_p = dir =>
  fse
    .stat(dir)
    .catch(() => mkdir_p(path.dirname(dir)))
    .then(stats => (stats && stats.isDirectory ? null : fse.mkdir(dir)));

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

const logReject = message => console.error(message) || Promise.reject(message);

const send = result =>
  result.res.status(result.status).send({message: result.message});

app.post('/', (req, res) =>
  Promise.resolve()
    .then(
      () =>
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

          form.parse(req, (err, fields, files) =>
            err
              ? reject(err)
              : resolve({
                  fields,
                  files,
                }),
          );
        }),
    )
    .tap(console.error)
    /*
    .tap(({fields}) =>
      fse.mkdir(
        path.dirname(path.resolve(config.uploadDir, fields.file_path)),
        {recursive: true},
      ),
    )
    */
    .tap(({fields}) =>
      mkdir_p(path.dirname(path.resolve(config.uploadDir, fields.file_path))),
    )
    .then(({fields, files}) => ({
      oldFile: files.file.path,
      newFile: path.resolve(config.uploadDir, fields.file_path),
    }))
    .tap(({oldFile, newFile}) => fse.rename(oldFile, newFile))
    .then(({newFile}) => {
      return {
        message: `Wrote ${newFile.replace(config.uploadDir, '')} to disk`,
        res,
        status: 200,
      };
    })
    .then(send)
    .catch(logReject)
    .catch(send)
    .catch(err =>
      send({
        message: 'Unexpected error',
        res,
        status: 500,
      }),
    ),
);

app.get('/', (req, res) =>
  Promise.resolve()
    .then(() => fse.mkdtemp(path.resolve(os.tmpdir(), 'http.upload.')))
    .then(folder => ({
      file: path.resolve(folder, 'assets.tar.gz'),
      folder,
    }))
    .tap(({file, folder}) =>
      tar.c(
        {
          gzip: true,
          C: config.uploadDir,
          file,
        },
        ['assets'],
      ),
    )
    .tap(
      ({file}) =>
        new Promise((resolve, reject) =>
          res.download(file, path.basename(file), err =>
            err ? reject(err) : resolve(),
          ),
        ),
    )
    .catch(err => {
      console.error(err);

      res.sendStatus(500);
    })
    .tap(({file, folder}) => fse.unlink(file))
    .tap(({folder}) => fse.rmdir(folder))
    .catch(err => {
      console.error(err);
    }),
);

mkdir_p(config.uploadDir);

app.listen(env.PORT || config.port || 3000, err => {
  if (err) {
    console.error(err);
  }
});
