'use strict';

const npminstall = require('../');
const config = require('../lib/config');
const utils = require('../lib/utils');

module.exports = function* (options) {
  yield formatOptions(options);
  return yield npminstall(options);
};

module.exports.installGlobal = function* installGlobal(options) {
  yield formatOptions(options);
  return yield npminstall.installGlobal(options);
};

function* formatOptions(options) {
  if (process.env.local) {
    options.registry = config.chineseRegistry;
    options.binaryMirrors = yield utils.getBinaryMirrors(options.registry);
    options.env = options.env || {};
    for (const key in options.binaryMirrors.ENVS) {
      options.env[key] = options.binaryMirrors.ENVS[key];
    }
  }
  if (options.customBinaryMirrors) {
    options.binaryMirrors = options.binaryMirrors || {};
    for (const key in options.customBinaryMirrors) {
      options.binaryMirrors[key] = options.customBinaryMirrors[key];
    }
  }
}
