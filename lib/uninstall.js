'use strict';

const path = require('path');
const fs = require('mz/fs');
const chalk = require('chalk');
const utils = require('./utils');
const preUninstall = require('./preuninstall');
const postUninstall = require('./postuninstall');

module.exports = async options => {
  const pkgs = options.pkgs;
  options.console = options.console || console;

  const uninstalled = [];
  for (const pkg of pkgs) {
    const succeed = await uninstall(pkg, options);
    if (succeed) {
      uninstalled.push(pkg);
    }
  }

  return uninstalled;
};

async function uninstall(pkg, options) {
  const storeDir = options.global
    ? path.join(options.targetDir, 'node_modules', `.${pkg.name}_npminstall/node_modules`)
    : path.join(options.targetDir, 'node_modules');

  const pkgRoot = path.join(options.targetDir, 'node_modules', pkg.name);
  const pkgInfo = await utils.readJSON(path.join(pkgRoot, 'package.json'));

  if (pkgInfo.name !== pkg.name) return false;
  if (pkg.version && pkg.version !== pkgInfo.version) return false;

  const realRoot = utils.getPackageStorePath(storeDir, pkgInfo);

  await preUninstall(pkgInfo, realRoot, options);
  if (options.global) {
    await utils.rimraf(pkgRoot);
    await utils.rimraf(storeDir);
  } else {
    await utils.rimraf(pkgRoot);
    await utils.rimraf(realRoot);
  }
  const pkgFile = path.resolve(options.targetDir, 'package.json');
  if (await fs.exists(pkgFile)) {
    await utils.pruneJSON(pkgFile, pkg.name);
  }
  await postUninstall(pkgInfo, realRoot, options);
  options.console.log('- %s %s -> %s',
    chalk.yellow(`${pkgInfo.name}@${pkgInfo.version}`),
    chalk.gray(pkgRoot.replace(options.root, '.')),
    chalk.gray(realRoot.replace(options.root, '.')));

  for (const file in pkgInfo.bin) {
    const binPath = path.join(options.binDir, file);
    await utils.rimraf(binPath);
    options.console.log('- %s %s',
      chalk.yellow(`${pkgInfo.name}@${pkgInfo.version}`),
      chalk.gray(binPath.replace(options.root, '.')));
  }
  return true;
}
