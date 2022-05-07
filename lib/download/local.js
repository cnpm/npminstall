'use strict';

const debug = require('debug')('npminstall:download:local');
const rimraf = require('mz-modules/rimraf');
const fs = require('mz/fs');
const path = require('path');
const chalk = require('chalk');
const uuid = require('uuid');
const packlist = require('npm-packlist');
const tar = require('tar');

const utils = require('../utils');

module.exports = async (pkg, options) => {
  const {
    fetchSpec,
    displayName,
  } = pkg;
  options.localPackages++;
  let filepath = fetchSpec;

  try {
    filepath = await fs.realpath(filepath);
    const stat = await fs.stat(filepath);
    return stat.isDirectory()
      ? await localFolder(filepath, pkg, options)
      : await localTarball(filepath, pkg, options);
  } catch (err) {
    throw new Error(`[${displayName}] resolved target ${filepath} error: ${err.message}`);
  }
};

async function localFolder(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local folder ${filepath}`);
  try {
    // everytime copy to a different directory to avoid parallel install
    const tmpDir = path.join(options.storeDir, '.tmp', uuid());
    await utils.mkdirp(tmpDir);

    const tarball = path.join(tmpDir, `${pkg.name}.tar`);
    // use `packlist` to ensure npmignore/gitignore/package.files work fine
    const files = await packlist({ path: filepath });
    await tar.create({
      cwd: filepath,
      file: tarball,
      gzip: true,
    }, files);

    try {
      return await localTarball(tarball, pkg, options);
    } finally {
      await rimraf(tmpDir);
    }
  } catch (err) {
    // fallback to copy
    debug(`install ${pkg.name}@${pkg.rawSpec} from local folder ${filepath} with npm pack failed(${err.message}), use copy`);
    return await utils.copyInstall(filepath, options);
  }
}

async function localTarball(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local tarball ${filepath}`);
  const readstream = fs.createReadStream(filepath);
  // everytime unpack to a different directory
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  await utils.mkdirp(ungzipDir);
  try {
    await utils.unpack(readstream, ungzipDir, pkg);
    return await utils.copyInstall(ungzipDir, options);
  } finally {
    // clean up
    try {
      await utils.rimraf(ungzipDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir local ungzip dir: ${ungzipDir} error: ${err}, ignore it`));
    }
  }
}
