/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('npminstall:bin');
const path = require('path');
const fs = require('mz/fs');
const cmdShim = require('cmd-shim');
const utils = require('./utils');

module.exports = bin;

function* bin(parentDir, pkg, pkgDir, options) {
  let bins = pkg.bin || {};
  if (typeof bins === 'string') {
    bins = {};
    bins[pkg.name] = pkg.bin;
  }

  const names = Object.keys(bins);
  if (names.length === 0) return;

  // root package link to options.binDir first
  const binDir = options.binDir && parentDir === options.targetDir
    ? options.binDir
    : path.join(parentDir, 'node_modules/.bin');
  yield utils.mkdirp(binDir);

  for (const name of names) {
    const srcBin = path.join(pkgDir, bins[name]);
    const destBin = path.join(binDir, name);
    yield fs.chmod(srcBin, 0o755);
    const relative = yield linkBin(srcBin, destBin);
    debug('[%s@%s] link %s => %s',
      pkg.name, pkg.version, srcBin, relative);
  }
}

function* linkBin(src, dest) {
  if (process.platform === 'win32') {
    return new Promise((resolve, reject) => {
      cmdShim.ifExists(src, dest, err => {
        if (err) return reject(err);
        resolve(dest);
      });
    });
  } else {
    return yield utils.forceSymlink(src, dest);
  }
}
