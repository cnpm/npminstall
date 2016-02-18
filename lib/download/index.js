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

const npm = require('./npm');

module.exports = function* (pkg, options) {
  return yield npm(pkg, options);
};
