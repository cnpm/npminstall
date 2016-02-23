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

const debug = require('debug')('npminstall:download:local');
const fs = require('mz/fs');
const path = require('path');
const utils = require('../utils');
const uuid = require('node-uuid');

module.exports = function* (pkg, options) {
  options.localPackages++;
  let filepath = pkg.spec;
  if (!path.isAbsolute(filepath)) {
    filepath = path.join(options.root, filepath);
  } else {
    // npa resolve './file/path' from process.cwd()
    // but we want to resove from `options.root`
    if (pkg.rawSpec[0] === '.') {
      filepath = path.join(options.root, pkg.rawSpec);
    }
  }

  try {
    filepath = yield fs.realpath(filepath);
    const stat = yield fs.stat(filepath);
    return stat.isDirectory()
      ? yield localFolder(filepath, pkg, options)
      : yield localTarball(filepath, pkg, options);
  } catch (err) {
    throw new Error(`[${pkg.name}@${pkg.rawSpec}] resolved target ${filepath} error: ${err.message}`);
  }
};

function* localFolder(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local folder ${filepath}`);
  return yield utils.copyInstall(filepath, options);
}

function* localTarball(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local tarball ${filepath}`);
  const readstream = fs.createReadStream(filepath);
  // everytime unpack to a different directory
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(ungzipDir);
  try {
    yield utils.unpack(readstream, ungzipDir);
    const r = yield utils.copyInstall(ungzipDir, options);
    return r;
  } finally {
    // clean up
    yield utils.rimraf(ungzipDir);
  }
}
