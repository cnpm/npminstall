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

const debug = require('debug')('npminstall:link');
const utils = require('./utils');
const path = require('path');

module.exports = function* link(parentDir, pkg, realDir) {
  const linkDir = path.join(parentDir, 'node_modules', pkg.name);
  const stat = yield utils.forceStat(linkDir);
  if (stat && stat.isDirectory()) {
    // bundledDependencies like node-pre-gyp@0.6.19, ignore it
    return;
  }
  yield utils.mkdirp(path.dirname(linkDir));
  const relativeDir = path.relative(path.dirname(linkDir), realDir);
  debug('%s@%s link %s => %s', pkg.name, pkg.version, linkDir, realDir);
  yield utils.forceSymlink(relativeDir, linkDir);
};
