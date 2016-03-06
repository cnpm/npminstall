/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

const path = require('path');
const destroy = require('destroy');
const uuid = require('node-uuid');
const chalk = require('chalk');
const utils = require('../utils');
const get = require('../get');

module.exports = function* (pkg, options) {
  options.remotePackages++;
  const remoteUrl = pkg.spec;
  options.console.warn(chalk.yellow(`install ${pkg.name || ''} from remote ${remoteUrl}, may be very slow, please keep patience`));
  const readstream = yield getTarballStream(remoteUrl, options);
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
    yield utils.rimraf(ungzipDir);
  }
};

function* getTarballStream(url, options) {
  const result = yield get(url, {
    timeout: options.timeout,
    followRedirect: true,
    streaming: true,
  }, options);

  if (result.status !== 200) {
    destroy(result.res);
    throw new Error(`Download ${url} status: ${result.status} error, should be 200`);
  }
  return result.res;
}
