'use strict';

const path = require('path');
const utils = require('./utils');
const chalk = require('chalk');
const preUninstall = require('./preuninstall');
const postUninstall = require('./postuninstall');

module.exports = function* (options) {
  const pkgs = options.pkgs;
  options.console = options.console || console;

  const uninstalled = [];
  for (const pkg of pkgs) {
    const succeed = yield uninstall(pkg, options);
    if (succeed) {
      uninstalled.push(pkg);
    }
  }

  return uninstalled;
};

function* uninstall(pkg, options) {
  const storeDir = options.global
    ? path.join(options.targetDir, 'node_modules', `.${pkg.name}_npminstall/node_modules`)
    : path.join(options.targetDir, 'node_modules');

  const pkgRoot = path.join(options.targetDir, 'node_modules', pkg.name);
  const pkgInfo = yield utils.readJSON(path.join(pkgRoot, 'package.json'));

  if (pkgInfo.name !== pkg.name) return false;
  if (pkg.version && pkg.version !== pkgInfo.version) return false;

  const realRoot = utils.getPackageStorePath(storeDir, pkgInfo);

  yield preUninstall(pkgInfo, realRoot, options);
  if (options.global) {
    yield utils.rimraf(pkgRoot);
    yield utils.rimraf(storeDir);
  } else {
    yield utils.rimraf(pkgRoot);
    yield utils.rimraf(realRoot);
  }
  yield postUninstall(pkgInfo, realRoot, options);
  options.console.log('- %s %s -> %s',
    chalk.yellow(`${pkgInfo.name}@${pkgInfo.version}`),
    chalk.gray(pkgRoot.replace(options.root, '.')),
    chalk.gray(realRoot.replace(options.root, '.')));

  for (const file in pkgInfo.bin) {
    const binPath = path.join(options.binDir, file);
    yield utils.rimraf(binPath);
    options.console.log('- %s %s',
    chalk.yellow(`${pkgInfo.name}@${pkgInfo.version}`),
    chalk.gray(binPath.replace(options.root, '.')));
  }
  return true;
}
