'use strict';

const path = require('path');
const uuid = require('uuid');
const chalk = require('chalk');
const pacote = require('pacote');
const utils = require('../utils');

module.exports = async (pkg, options) => {
  const {
    name,
    raw,
    displayName,
  } = pkg;

  options.gitPackages++;
  options.console.warn(chalk.yellow(`[${displayName}] install ${name || ''} from git ${raw}, may be very slow, please keep patience`));
  const cloneDir = path.join(options.storeDir, '.tmp', uuid());
  await utils.mkdirp(cloneDir);
  try {
    const resolveResult = await pacote.extract(raw, cloneDir);
    const resolved = resolveResult.resolved;
    await utils.addMetaToJSONFile(path.join(cloneDir, 'package.json'), {
      _from: raw,
      _resolved: resolved,
    });
    const res = await utils.copyInstall(cloneDir, options);
    if (name && name !== res.package.name) {
      options.console.warn(chalk.yellow(`[${displayName}] Package name unmatched: expected ${name} but found ${res.package.name}`));
      res.package.name = name;
    }
    // record package name
    options.remoteNames[raw] = res.package.name;
    return res;
  } catch (err) {
    throw new Error(`[${displayName}] ${err.message}`);
  } finally {
    // clean up
    try {
      await utils.rimraf(cloneDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir git clone dir: ${cloneDir} error: ${err}, ignore it`));
    }
  }
};
