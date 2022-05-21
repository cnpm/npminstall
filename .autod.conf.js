'use strict';

module.exports = {
  write: true,
  prefix: '^',
  dep: [
    'node-gyp',
  ],
  keep: [
    'binary-mirror-config',
  ],
  exclude: [
    './test/fixtures',
    '.tmp',
  ],
};
