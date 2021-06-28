'use strict';

const path = require('path');
const uuid = require('uuid');
const chalk = require('chalk');
const utils = require('../utils');

module.exports = async (pkg, options) => {
  const {
    name,
    raw,
    fetchSpec,
    displayName,
  } = pkg;

  options.remotePackages++;
  const remoteUrl = fetchSpec;
  options.console.warn(chalk.yellow(`[${displayName}] install ${name || ''} from remote ${remoteUrl}, may be very slow, please keep patience`));
  const readstream = await utils.getTarballStream(remoteUrl, options);
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  await utils.mkdirp(ungzipDir);
  try {
    await utils.unpack(readstream, ungzipDir, pkg);
    await utils.addMetaToJSONFile(path.join(ungzipDir, 'package.json'), {
      _from: name ? `${name}@${remoteUrl}` : remoteUrl,
      _resolved: remoteUrl,
    });
    const res = await utils.copyInstall(ungzipDir, options);
    if (name && name !== res.package.name) {
      throw new Error(`Invalid Package, expected ${name} but found ${res.package.name}`);
    }
    // record package name
    options.remoteNames[raw] = res.package.name;
    return res;
  } catch (err) {
    throw new Error(`[${displayName}] ${err.message}`);
  } finally {
    // clean up
    try {
      await utils.rimraf(ungzipDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir remote ungzip dir: ${ungzipDir} error: ${err}, ignore it`));
    }
  }
};
