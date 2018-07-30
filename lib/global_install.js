'use strict';

/**
 * impl npm install -g pkg1[, pkg2, ...]
 */

const path = require('path');
const utility = require('utility');
const fs = require('mz/fs');
const chalk = require('chalk');
const npa = require('npm-package-arg');
const installLocal = require('./local_install');
const utils = require('./utils');
const download = require('./download');
const bin = require('./bin');
const formatInstallOptions = require('./format_install_options');

module.exports = function* globalInstall(options) {
  const pkgs = options.pkgs || [];
  const globalTargetDir = options.targetDir;
  const globalBinDir = options.binDir;
  options.pkgs = [];
  options.targetDir = null;
  options.binDir = null;

  const opts = Object.assign({}, options);
  for (const pkg of pkgs) {
    let name = pkg.name;
    if (!name) {
      name = utility.md5(pkg.version);
    }

    // compatibility: delete old store dir
    const oldStoreDir = path.join(globalTargetDir, 'node_modules', `.${name}_npminstall/node_modules`);
    yield utils.rimraf(oldStoreDir);

    const tmpDir = path.join(globalTargetDir, `node_modules/${name}_tmp`);
    yield utils.rimraf(tmpDir);

    const installOptions = formatInstallOptions(Object.assign({}, opts, {
      storeDir: tmpDir,
      cache: {},
    }));

    console.info(chalk.gray(`Downloading ${name} to ${tmpDir}`));
    const p = npa(pkg.name ? `${pkg.name}@${pkg.version}` : pkg.version);
    const result = yield download(p, installOptions);

    // read the real package.json and get the pakcage's name
    const realPkg = yield utils.readJSON(path.join(result.dir, 'package.json'));
    // add `node_modules` in the last to ensure `module.paths` contains storeDir
    const targetDir = path.join(globalTargetDir, `node_modules/${realPkg.name}`);
    console.info(chalk.gray(`Copying ${result.dir} to ${targetDir}`));
    yield utils.rimraf(targetDir);
    yield fs.rename(result.dir, targetDir);
    yield utils.rimraf(tmpDir);

    console.info(chalk.gray(`Installing ${realPkg.name}'s dependencies to ${targetDir}/node_modules`));
    const pkgOptions = Object.assign({}, opts, {
      root: targetDir,
      // don't install devDeps
      production: true,
    });

    yield installLocal(pkgOptions);

    // handle bin link
    pkgOptions.binDir = globalBinDir;
    yield bin(targetDir, realPkg, targetDir, pkgOptions);
  }
};
