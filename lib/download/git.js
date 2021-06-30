'use strict';

const path = require('path');
const uuid = require('uuid');
const chalk = require('chalk');
const runscript = require('runscript');
const utils = require('../utils');

module.exports = async (pkg, options) => {
  const {
    name,
    raw,
    hosted,
    displayName,
  } = pkg;

  options.gitPackages++;
  options.console.warn(chalk.yellow(`[${displayName}] install ${name || ''} from git ${raw}, may be very slow, please keep patience`));
  const url = hosted.https();
  const branchOrCommit = hosted.committish || 'master';
  const cloneDir = path.join(options.storeDir, '.tmp', uuid());
  await utils.mkdirp(cloneDir);
  try {
    let commit;

    if (hosted.type === 'github') {
      try {
        // try download tarball first
        // github.com can download tarball via branch, too
        await downloadAndExtract(url, branchOrCommit, cloneDir, options);
        commit = branchOrCommit;
      } catch (err) {
        options.console.warn(chalk.yellow(`download tarball failed: ${err.message}, try to clone repository now.`));
        await clone(url, branchOrCommit, cloneDir, options);
        commit = await getLastCommitHash(cloneDir);
      }
    } else {
      await clone(url, branchOrCommit, cloneDir, options);
      commit = await getLastCommitHash(cloneDir);
    }

    const resolved = `${url}#${commit}`;
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

async function clone(url, branch, target, options) {
  const cloneScript = `git clone ${url} ${target}`;
  options.console.warn(chalk.yellow(cloneScript));
  await runscript(cloneScript, {
    stdio: [
      'ignore',
      'inherit',
      'inherit',
    ],
  });

  const coScript = `git checkout ${branch}`;
  options.console.warn(chalk.yellow(coScript));
  await utils.runScript(target, coScript, options);

}

async function downloadAndExtract(url, branch, target, options) {
  const downloadUrl = `${url.replace(/\.git$/, '')}/tarball/${branch}`;
  const readstream = await utils.getTarballStream(downloadUrl, options);
  await utils.mkdirp(target);
  await utils.unpack(readstream, target, url);
}

async function getLastCommitHash(target) {
  const script = 'git log -1 --format="%H"';
  const stdio = await runscript(script, {
    cwd: target,
    stdio: [
      'ignore',
      'pipe',
      'inherit',
    ],
  });
  return stdio.stdout && stdio.stdout.toString().trim() || '';
}
