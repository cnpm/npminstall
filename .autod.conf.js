'use strict';

module.exports = {
  registry: 'https://r.cnpmjs.org',
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
    '.tmp',
  ],
};
