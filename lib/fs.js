const fse = require('fs-extra');
const path = require('path');

const mkdir_p = dir =>
  fse
    .stat(dir)
    .catch(() => mkdir_p(path.dirname(dir)))
    .then(stats => (stats && stats.isDirectory ? null : fse.mkdir(dir)));

module.exports = {
  mkdir_p
};
