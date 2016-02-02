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
const utils = require('./utils');

module.exports = bin;

function* bin(parentDir, pkg, pkgDir) {
  let bins = pkg.bin || {};
  if (typeof bins === 'string') {
    bins = {};
    bins[pkg.name] = pkg.bin;
  }

  const names = Object.keys(bins);
  if (names.length === 0) {
    return;
  }

  const binDir = path.join(parentDir, 'node_modules', '.bin');
  yield utils.mkdirp(binDir);

  for (const name of names) {
    const binFile = path.join(pkgDir, bins[name]);
    const binLink = path.join(binDir, name);
    const relative = path.relative(path.dirname(binLink), binFile);
    debug('[%s@%s] link %s => %s',
      pkg.name, pkg.version, binLink, relative);
    // console.log(binFile, binLink);
    yield fs.chmod(binFile, 0o755);
    yield utils.forceSymlink(relative, binLink);
  }
}
