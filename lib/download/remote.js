'use strict';

const path = require('path');
const uuid = require('uuid');
const chalk = require('chalk');
const utils = require('../utils');

module.exports = async (pkg, options) => {
  options.remotePackages++;
  const remoteUrl = pkg.spec;
  options.console.warn(chalk.yellow(`[${pkg.displayName}] install ${pkg.name || ''} from remote ${remoteUrl}, may be very slow, please keep patience`));
  const readstream = await utils.getTarballStream(remoteUrl, options);
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  await utils.mkdirp(ungzipDir);
  try {
    await utils.unpack(readstream, ungzipDir, pkg);
    await utils.addMetaToJSONFile(path.join(ungzipDir, 'package.json'), {
      _from: pkg.name ? `${pkg.name}@${remoteUrl}` : remoteUrl,
      _resolved: remoteUrl,
    });
    const res = await utils.copyInstall(ungzipDir, options);
    if (pkg.name && pkg.name !== res.package.name) {
      throw new Error(`Invalid Package, expected ${pkg.name} but found ${res.package.name}`);
    }
    // record package name
    options.remoteNames[pkg.raw] = res.package.name;
    return res;
  } catch (err) {
    throw new Error(`[${pkg.displayName}] ${err.message}`);
  } finally {
    // clean up
    try {
      await utils.rimraf(ungzipDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir remote ungzip dir: ${ungzipDir} error: ${err}, ignore it`));
    }
  }
};
