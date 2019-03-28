'use strict';

const debug = require('debug')('npminstall:download:local');
const fs = require('mz/fs');
const path = require('path');
const chalk = require('chalk');
const uuid = require('uuid');
const utils = require('../utils');

module.exports = function* (pkg, options) {
  options.localPackages++;
  let filepath = pkg.spec;
  if (!path.isAbsolute(filepath)) {
    filepath = path.join(options.root, filepath);
  } else {
    // npa resolve './file/path' from process.cwd()
    // but we want to resolve from `options.root`
    if (pkg.rawSpec[0] === '.') {
      filepath = path.join(options.root, pkg.rawSpec);
    }
  }

  try {
    filepath = yield fs.realpath(filepath);
    const stat = yield fs.stat(filepath);
    return stat.isDirectory()
      ? yield localFolder(filepath, pkg, options)
      : yield localTarball(filepath, pkg, options);
  } catch (err) {
    throw new Error(`[${pkg.displayName}] resolved target ${filepath} error: ${err.message}`);
  }
};

function* localFolder(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local folder ${filepath}`);
  return yield utils.copyInstall(filepath, options);
}

function* localTarball(filepath, pkg, options) {
  debug(`install ${pkg.name}@${pkg.rawSpec} from local tarball ${filepath}`);
  const readstream = fs.createReadStream(filepath);
  // everytime unpack to a different directory
  const ungzipDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(ungzipDir);
  try {
    yield utils.unpack(readstream, ungzipDir, pkg);
    const r = yield utils.copyInstall(ungzipDir, options);
    return r;
  } finally {
    // clean up
    try {
      yield utils.rimraf(ungzipDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir local ungzip dir: ${ungzipDir} error: ${err}, ignore it`));
    }
  }
}
