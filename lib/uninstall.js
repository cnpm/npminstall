'use strict';

const path = require('path');
const utils = require('./utils');
const chalk = require('chalk');
const preUninstall = require('./preuninstall');
const postUninstall = require('./postuninstall');

module.exports = function* (options) {
  const root = options.root;
  const pkgs = options.pkgs;
  options.console = options.console || console;

  const uninstalled = [];
  for (const pkg of pkgs) {
    const succeed = yield uninstall(root, pkg, options);
    if (succeed) {
      uninstalled.push(pkg);
    }
  }

  return uninstalled;
};

function* uninstall(root, pkg, options) {
  const pkgRoot = path.join(root, 'node_modules', pkg.name);
  const pkgInfo = yield utils.readJSON(path.join(pkgRoot, 'package.json'));
  if (pkgInfo.name !== pkg.name) return false;
  if (pkg.version && pkg.version !== pkgInfo.version) return false;

  const storeDir = path.join(root, 'node_modules');
  const realRoot = utils.getPackageStorePath(storeDir, pkgInfo);

  yield preUninstall(pkgInfo, realRoot, options);
  yield utils.rimraf(pkgRoot);
  yield utils.rimraf(realRoot);
  yield postUninstall(pkgInfo, realRoot, options);

  options.console.log('- %s %s -> %s',
    chalk.yellow(`${pkgInfo.name}@${pkgInfo.version}`),
    chalk.gray(pkgRoot.replace(options.root, '')),
    chalk.gray(realRoot.replace(options.root, '')));
  return true;
}
