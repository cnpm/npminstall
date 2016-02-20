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
const uuid = require('node-uuid');
const chalk = require('chalk');
const utils = require('../utils');
const runscript = require('runscript');

module.exports = function* (pkg, options) {
  options.gitPackages++;
  options.console.warn(chalk.yellow(`install ${pkg.name || ''} from git ${pkg.spec}, may be very slow, please keep patience`));
  const gitInfo = parseGitInfo(pkg);
  const cloneDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(cloneDir);
  try {
    yield clone(gitInfo.url, gitInfo.branch, cloneDir, options);
    return yield utils.copyInstall(cloneDir, options);
  } catch (err) {
    throw new Error(`[${pkg.name}@${pkg.rawSpec}]: ${err.message}`);
  } finally {
    // clean up
    yield utils.rimraf(cloneDir);
  }
};

function parseGitInfo(pkg) {
  let url;
  if (pkg.type === 'git') {
    url = pkg.spec;
  } else {
    // try https git url first
    if (pkg.hosted.httpsUrl) {
      // git+https://github.com/node-modules/pedding.git#0.0.3
      url = pkg.hosted.httpsUrl.replace('git+', '');
    } else if (pkg.hosted.gitUrl) {
      // git://github.com/node-modules/pedding.git#0.0.3
      url = pkg.hosted.gitUrl;
    } else {
      url = pkg.hosted.ssh;
    }
  }
  const branchReg = /#(.*)$/;
  const r = branchReg.exec(url);
  const branch = r && r[1] ? r[1] : 'master';
  url = url.replace(branchReg, '');
  return {
    url,
    branch,
  };
}

function* clone(url, branch, target, options) {
  const script = `git clone -b ${branch} ${url} ${target} --depth=1`;
  options.console.warn(chalk.yellow(script));
  yield runscript(script, {
    stdio: [
      'ignore',
      'inherit',
      'inherit',
    ],
  });
}
