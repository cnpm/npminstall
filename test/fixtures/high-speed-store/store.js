'use strict';

const co = require('co');
const path = require('path');
const fs = require('mz/fs');
const mkdirp = require('mz-modules/mkdirp');
const utility = require('utility');
const urllib = require('urllib');

exports.getStream = function* (url) {
  const dir = path.join(__dirname, 'tmp');
  yield mkdirp(dir);
  const file = path.join(dir, utility.md5(url) + path.extname(url));
  if (yield fs.exists(file)) {
    return fs.createReadStream(file);
  }

  const writeStream = fs.createWriteStream(file);
  yield urllib.request(url, {
    writeStream,
    timeout: 10000,
    followRedirect: true,
  });
  return fs.createReadStream(file);
};
