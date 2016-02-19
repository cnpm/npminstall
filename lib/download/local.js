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
const fse = require('co-fs-extra');
const fs = require('mz/fs');
const path = require('path');
const utility = require('utility');
const utils = require('../utils');
const uuid = require('node-uuid');

module.exports = function* (pkg, options) {
  let filepath = pkg.spec;
  if (!path.isAbsolute(filepath)) {
    filepath = path.join(options.root, filepath);
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
  const pkgpath = path.join(filepath, 'package.json');
  if (!(yield fs.exists(pkgpath))) {
    throw new Error('package.json missed');
  }

  const realPkg = yield utils.readJSON(pkgpath);
  if (!realPkg.name) {
    throw new Error('package.json must contains name');
  }
  const targetdir = path.join(options.storeDir, realPkg.name, utility.md5(filepath));
  if (yield fs.exists(targetdir)) {
    return {
      exists: true,
      dir: targetdir,
      package: realPkg,
    };
  }

  yield utils.mkdirp(path.dirname(targetdir));
  yield fse.copy(filepath, targetdir);
  return {
    exists: false,
    dir: targetdir,
    package: realPkg,
  };
}

function* localTarball(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local tarball ${filepath}`);
  const readstream = fs.createReadStream(filepath);
  // unzip to a tmp dir
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(ungzipDir);
  yield utils.decompress(readstream, ungzipDir);
  const pkgpath = path.join(ungzipDir, 'package.json');
  try {
    if (!(yield fs.exists(pkgpath))) {
      throw new Error('package.json missed');
    }

    const realPkg = yield utils.readJSON(pkgpath);
    if (!realPkg.name) {
      throw new Error('package.json must contains name');
    }
    const targetdir = path.join(options.storeDir, realPkg.name, utility.md5(filepath));
    if (yield fs.exists(targetdir)) {
      return {
        exists: true,
        dir: targetdir,
        package: realPkg,
      };
    }

    yield utils.mkdirp(path.dirname(targetdir));
    yield fse.copy(ungzipDir, targetdir);
    return {
      exists: false,
      dir: targetdir,
      package: realPkg,
    };
  } finally {
    // clean up
    yield utils.rimraf(ungzipDir);
  }
}
