/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

const npminstall = require('../');
const config = require('../lib/config');

module.exports = function*(options) {
  formatOptions(options);
  return yield npminstall(options);
};

module.exports.installGlobal = function*(options) {
  formatOptions(options);
  return yield npminstall.installGlobal(options);
};

function formatOptions(options) {
  if (process.env.local) {
    options.registry = config.chineseRegistry;
    options.env = options.env || {};
    for (const key in config.chineseMirrorEnv) {
      options.env[key] = config.chineseMirrorEnv[key];
    }
  }
}
