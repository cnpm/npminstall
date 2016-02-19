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
const runscript = require('runscript');
const get = require('../get');

module.exports = function* (pkg, options) {
  options.gitPackages++;
  console.warn(chalk.yellow(`install ${pkg.name || ''} from git ${pkg.spec}, may be very slow, please keep patience`));
  const gitInfo = parseGitInfo(pkg);
  const cloneDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(cloneDir);
  try {
    yield clone(gitInfo.url, gitInfo.branch, cloneDir);
    return yield utils.copyInstall(cloneDir, options);
  } finally {
    // clean up
    yield utils.rimraf(cloneDir);
  }
};

function parseGitInfo(pkg) {
  let url = pkg.type === 'git'
    ? pkg.spec
    : pkg.hosted.ssh;
  const sshProtocol = 'ssh://';
  if (url.startsWith(sshProtocol)) {
    url = url.slice(sshProtocol.length);
  }
  const branchReg = /#(.*)$/;
  const r = branchReg.exec(url);
  const branch = r ? r[1] : 'master';
  url = url.replace(branchReg, '');
  return {
    url,
    branch,
  };
}

function* clone(url, branch, target) {
  const script = `git clone -b ${branch} ${url} ${target} --depth=1`;
  yield runscript(script, {
    stdio: 'ignore',
  });
}
