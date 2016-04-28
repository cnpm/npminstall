'use strict';

module.exports = {
  write: true,
  prefix: '~',
  devprefix: '^',
  keep: [
    'binary-mirror-config',
  ],
  exclude: [
    './benchmark',
    './test/fixtures',
  ],
};
