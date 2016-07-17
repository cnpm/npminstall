'use strict';

const path = require('path');
const urlutil = require('url');
const uuid = require('node-uuid');
const chalk = require('chalk');
const runscript = require('runscript');
const utils = require('../utils');

module.exports = function* (pkg, options) {
  options.gitPackages++;
  options.console.warn(chalk.yellow(`install ${pkg.name || ''} from git ${pkg.spec}, may be very slow, please keep patience`));
  const gitInfo = parseGitInfo(pkg);
  const cloneDir = path.join(options.storeDir, '.tmp', uuid());
  yield utils.mkdirp(cloneDir);
  try {
    const hostname = urlutil.parse(gitInfo.url).hostname;
    let commit;

    if (hostname === 'github.com') {
      try {
        // try download tarball first
        // github.com can download tarball via branch, too
        yield downloadAndExtract(gitInfo.url, gitInfo.branch, cloneDir, options);
        commit = gitInfo.branch;
      } catch (err) {
        options.console.warn(chalk.yellow(`download tarball failed: ${err.message}, try to clone repository now.`));
        yield clone(gitInfo.url, gitInfo.branch, cloneDir, options);
        commit = yield getLastCommitHash(cloneDir);
      }
    } else {
      yield clone(gitInfo.url, gitInfo.branch, cloneDir, options);
      commit = yield getLastCommitHash(cloneDir);
    }

    const resolved = gitInfo.url + '#' + commit;
    yield utils.addMetaToJSONFile(path.join(cloneDir, 'package.json'), {
      _from: pkg.name ? `${pkg.name}@${gitInfo.fullUrl}` : gitInfo.fullUrl,
      _resolved: resolved,
    });
    return yield utils.copyInstall(cloneDir, options);
  } catch (err) {
    throw new Error(`[${pkg.name}@${pkg.rawSpec}]: ${err.message}`);
  } finally {
    // clean up
    try {
      yield utils.rimraf(cloneDir);
    } catch (err) {
      options.console.warn(chalk.yellow(`rmdir git clone dir: ${cloneDir} error: ${err}, ignore it`));
    }
  }
};

function parseGitInfo(pkg) {
  let fullUrl;
  if (pkg.type === 'git') {
    fullUrl = pkg.spec;
  } else {
    // try https git url first
    if (pkg.hosted.httpsUrl) {
      // git+https://github.com/node-modules/pedding.git#0.0.3
      fullUrl = pkg.hosted.httpsUrl.replace('git+', '');
    } else if (pkg.hosted.gitUrl) {
      // git://github.com/node-modules/pedding.git#0.0.3
      fullUrl = pkg.hosted.gitUrl;
    } else {
      fullUrl = pkg.hosted.ssh;
    }
  }
  const branchReg = /#(.*)$/;
  const r = branchReg.exec(fullUrl);
  const branch = r && r[1] ? r[1] : 'master';
  const url = fullUrl.replace(branchReg, '');
  return {
    fullUrl,
    url,
    branch,
  };
}

function* clone(url, branch, target, options) {
  const cloneScript = `git clone ${url} ${target}`;
  options.console.warn(chalk.yellow(cloneScript));
  yield runscript(cloneScript, {
    stdio: [
      'ignore',
      'inherit',
      'inherit',
    ],
  });

  const coScript = `git checkout ${branch}`;
  options.console.warn(chalk.yellow(coScript));
  yield utils.runScript(target, coScript, options);

}

function* downloadAndExtract(url, branch, target, options) {
  const downloadUrl = `${url.replace(/\.git$/, '')}/tarball/${branch}`;
  const readstream = yield utils.getTarballStream(downloadUrl, options);
  yield utils.mkdirp(target);
  yield utils.unpack(readstream, target);
}

function* getLastCommitHash(target) {
  const script = 'git log -1 --format="%H"';
  const stdio = yield runscript(script, {
    cwd: target,
    stdio: [
      'ignore',
      'pipe',
      'inherit',
    ],
  });
  return stdio.stdout && stdio.stdout.toString().trim() || '';
}
