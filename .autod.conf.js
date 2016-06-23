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
    './benchmark',
    './test/fixtures',
  ],
};
