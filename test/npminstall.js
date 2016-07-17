'use strict';

const npminstall = require('../');
const config = require('../lib/config');
const utils = require('../lib/utils');

module.exports = function* (options) {
  yield formatOptions(options);
  return yield npminstall(options);
};

module.exports.installGlobal = function* (options) {
  yield formatOptions(options);
  return yield npminstall.installGlobal(options);
};

function* formatOptions(options) {
  if (process.env.local) {
    options.registry = config.chineseRegistry;
    options.env = options.env || {};
    for (const key in config.chineseMirrorEnv) {
      options.env[key] = config.chineseMirrorEnv[key];
    }
    options.binaryMirrors = yield utils.getBinaryMirrors(options.registry);
  }
}
