'use strict';

const path = require('path');
const uuid = require('node-uuid');
const chalk = require('chalk');
const utils = require('../utils');

module.exports = function* (pkg, options) {
  options.remotePackages++;
  const remoteUrl = pkg.spec;
  options.console.warn(chalk.yellow(`install ${pkg.name || ''} from remote ${remoteUrl}, may be very slow, please keep patience`));
  const readstream = yield utils.getTarballStream(remoteUrl, options);
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(ungzipDir);
  try {
    yield utils.unpack(readstream, ungzipDir);
    yield utils.addMetaToJSONFile(path.join(ungzipDir, 'package.json'), {
      _from: pkg.name ? `${pkg.name}@${remoteUrl}` : remoteUrl,
      _resolved: remoteUrl,
    });
    return yield utils.copyInstall(ungzipDir, options);
  } catch (err) {
    throw new Error(`[${pkg.name}@${pkg.rawSpec}]: ${err.message}`);
  } finally {
    // clean up
    try {
      yield utils.rimraf(ungzipDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir remote ungzip dir: ${ungzipDir} error: ${err}, ignore it`));
    }
  }
};
