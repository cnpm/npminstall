'use strict';

const path = require('path');
const urlutil = require('url');
const uuid = require('uuid');
const chalk = require('chalk');
const runscript = require('runscript');
const ngu = require('normalize-git-url');
const utils = require('../utils');

module.exports = async (pkg, options) => {
  options.gitPackages++;
  options.console.warn(chalk.yellow(`[${pkg.displayName}] install ${pkg.name || ''} from git ${pkg.spec}, may be very slow, please keep patience`));
  const gitInfo = parseGitInfo(pkg);
  const cloneDir = path.join(options.storeDir, '.tmp', uuid());
  await utils.mkdirp(cloneDir);
  try {
    const hostname = urlutil.parse(gitInfo.url).hostname;
    let commit;

    if (hostname === 'github.com') {
      try {
        // try download tarball first
        // github.com can download tarball via branch, too
        await downloadAndExtract(gitInfo.url, gitInfo.branch, cloneDir, options);
        commit = gitInfo.branch;
      } catch (err) {
        options.console.warn(chalk.yellow(`download tarball failed: ${err.message}, try to clone repository now.`));
        await clone(gitInfo.url, gitInfo.branch, cloneDir, options);
        commit = await getLastCommitHash(cloneDir);
      }
    } else {
      await clone(gitInfo.url, gitInfo.branch, cloneDir, options);
      commit = await getLastCommitHash(cloneDir);
    }

    const resolved = gitInfo.url + '#' + commit;
    await utils.addMetaToJSONFile(path.join(cloneDir, 'package.json'), {
      _from: pkg.raw,
      _resolved: resolved,
    });
    const res = await utils.copyInstall(cloneDir, options);
    if (pkg.name && pkg.name !== res.package.name) {
      options.console.warn(chalk.yellow(`[${pkg.displayName}] Package name unmatched: expected ${pkg.name} but found ${res.package.name}`));
      res.package.name = pkg.name;
    }
    // record package name
    options.remoteNames[pkg.raw] = res.package.name;
    return res;
  } catch (err) {
    throw new Error(`[${pkg.displayName}] ${err.message}`);
  } finally {
    // clean up
    try {
      await utils.rimraf(cloneDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir git clone dir: ${cloneDir} error: ${err}, ignore it`));
    }
  }
};

function parseGitInfo(pkg) {
  // https://github.com/npm/npm-package-arg#result-object
  // type can be git and hosted
  // hosted support github, gitlab and bitbucket
  return pkg.type === 'git'
    ? ngu(pkg.rawSpec)
    : ngu(pkg.hosted.httpsUrl);
}

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
