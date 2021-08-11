'use strict';

/**
 * impl npm install -g pkg1[, pkg2, ...]
 */

const path = require('path');
const utility = require('utility');
const fs = require('mz/fs');
const chalk = require('chalk');
const npa = require('./npa');
const installLocal = require('./local_install');
const utils = require('./utils');
const download = require('./download');
const bin = require('./bin');
const formatInstallOptions = require('./format_install_options');

module.exports = async (options, context) => {
  const pkgs = options.pkgs || [];
  const globalTargetDir = options.targetDir;
  const globalBinDir = options.binDir;
  options.pkgs = [];
  options.targetDir = null;
  options.binDir = null;

  const opts = Object.assign({}, options);
  context.nested.update(pkgs.map(pkg => `${pkg.name}@${pkg.version}`));
  for (const pkg of pkgs) {
    const {
      name: pkgName,
      alias,
      version,
    } = pkg;
    let name = alias || pkgName;
    if (!name) {
      name = utility.md5(version);
    }

    // compatibility: delete old store dir
    const oldStoreDir = path.join(globalTargetDir, 'node_modules', `.${name}_npminstall/node_modules`);
    await utils.rimraf(oldStoreDir);

    const tmpDir = path.join(globalTargetDir, `node_modules/${name}_tmp`);
    await utils.rimraf(tmpDir);

    const installOptions = formatInstallOptions(Object.assign({}, opts, {
      storeDir: tmpDir,
      cache: {},
    }));

    const logName = alias ? `${name}(${pkgName})` : `${pkgName}`;
    console.info(chalk.gray(`Downloading ${logName} to ${tmpDir}`));
    const p = npa(pkg.name ? `${pkg.name}@${pkg.version}` : pkg.version, { where: options.root, nested: context.nested });
    const result = await download(p, installOptions);

    // read the real package.json and get the pakcage's name
    const realPkg = await utils.readJSON(path.join(result.dir, 'package.json'));
    // add `node_modules` in the last to ensure `module.paths` contains storeDir
    const targetDir = path.join(globalTargetDir, `node_modules/${alias || realPkg.name}`);
    console.info(chalk.gray(`Copying ${result.dir} to ${targetDir}`));
    await utils.rimraf(targetDir);
    await fs.rename(result.dir, targetDir);
    await utils.rimraf(tmpDir);

    console.info(chalk.gray(`Installing ${realPkg.name}'s dependencies to ${targetDir}/node_modules`));
    const pkgOptions = Object.assign({}, opts, {
      root: targetDir,
      // don't install devDeps
      production: true,
    });

    await installLocal(pkgOptions, context);

    // handle bin link
    pkgOptions.binDir = globalBinDir;
    await bin(targetDir, realPkg, targetDir, pkgOptions);
  }
};
