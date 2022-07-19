'use strict';

const chalk = require('chalk');
const debug = require('debug')('npminstall:bin');
const path = require('path');
const cmdShim = require('cmd-shim-hotfix');
const normalize = require('npm-normalize-package-bin');
const fixBin = require('bin-links/lib/fix-bin');
const utils = require('./utils');

module.exports = bin;

async function bin(parentDir, pkg, pkgDir, options) {
  // security fix
  // https://github.com/npm/cli/commit/19ce061a2ee165d8de862c8f0f733c222846b9e1#diff-b05945a9118978f01ad9162683e74404
  normalize(pkg);
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
  await utils.mkdirp(binDir);

  for (const name of names) {
    const srcBin = path.join(pkgDir, bins[name]);
    const destBin = path.join(binDir, name);
    await linkBin(srcBin, destBin);
    // ensure that bin are executable and not containing
    // windows line-endings(CRLF) on the hashbang line
    await fixBin(srcBin, 0o755);
    if (showBinLog) {
      options.console.info('[%s] link %s@ -> %s',
        chalk.green(pkg.name + '@' + pkg.version), chalk.magenta(destBin), srcBin);
    } else {
      debug('[%s@%s] link %s@ -> %s',
        pkg.name, pkg.version, destBin, srcBin);
    }
  }
}

async function linkBin(src, dest) {
  if (process.platform === 'win32') {
    return new Promise((resolve, reject) => {
      cmdShim.ifExists(src, dest, err => {
        if (err) return reject(err);
        resolve(dest);
      });
    });
  }

  await utils.forceSymlink(src, dest);
}
