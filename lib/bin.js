'use strict';

const chalk = require('chalk');
const debug = require('debug')('npminstall:bin');
const path = require('path');
const fs = require('mz/fs');
const cmdShim = require('cmd-shim-hotfix');
// npm-normalize-package-bin dont support node 4
let normalize;
if (process.version.indexOf('v4.') === -1) {
  normalize = require('npm-normalize-package-bin');
}
const utils = require('./utils');

module.exports = bin;

function* bin(parentDir, pkg, pkgDir, options) {
  // security fix
  // https://github.com/npm/cli/commit/19ce061a2ee165d8de862c8f0f733c222846b9e1#diff-b05945a9118978f01ad9162683e74404
  normalize && normalize(pkg);
  let bins = pkg.bin || {};
  if (typeof bins === 'string') {
    bins = {};
    bins[pkg.name] = pkg.bin;
  }

  const names = Object.keys(bins);
  if (names.length === 0) {
    return;
  }

  // root package link to options.binDir first
  let binDir;
  let showBinLog = false;
  if (options.binDir && parentDir === options.targetDir) {
    binDir = options.binDir;
    showBinLog = true;
  } else {
    binDir = path.join(parentDir, 'node_modules', '.bin');
  }
  yield utils.mkdirp(binDir);

  for (const name of names) {
    const srcBin = path.join(pkgDir, bins[name]);
    const destBin = path.join(binDir, name);
    yield fs.chmod(srcBin, 0o755);
    yield linkBin(srcBin, destBin);
    if (showBinLog) {
      options.console.info('[%s] link %s@ -> %s',
        chalk.green(pkg.name + '@' + pkg.version), chalk.magenta(destBin), srcBin);
    } else {
      debug('[%s@%s] link %s@ -> %s',
        pkg.name, pkg.version, destBin, srcBin);
    }
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
  }

  return yield utils.forceSymlink(src, dest);
}
