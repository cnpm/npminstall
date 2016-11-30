'use strict';

/**
 * impl npm install [pkg1, pkg2, ...]
 */

const debug = require('debug')('npminstall:local_install');
const chalk = require('chalk');
const path = require('path');
const ms = require('ms');
const parallel = require('co-parallel');
const semver = require('semver');
const bytes = require('bytes');
const Module = require('module');
const fs = require('mz/fs');
const moment = require('moment');
const utils = require('./utils');
const util = require('util');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const prepublish = require('./prepublish');
const install = require('./install');
const dependencies = require('./dependencies');
const formatInstallOptions = require('./format_install_options');

const spinner = utils.spinner();

/**
 * npm install
 * @param {Object} options - install options
 *  - {String} root - npm install root dir
 *  - {String} [registry] - npm registry url, default is `https://registry.npmjs.org`
 *  - {String} [targetDir] - node_modules target dir, default is ${root}.
 *  - {String} [storeDir] - npm modules store dir, default is `${targetDir}/node_modules`
 *  - {Number} [timeout] - npm registry request timeout, default is 60000 ms
 *  - {Console} [console] - console logger instance, default is `console`
 *  - {Array<Object>} [pkgs] - optional packages to install, default is `[]`
 *  - {Boolean} [production] - production mode install, default is `false`
 *  - {Object} [env] - postinstall and preinstall scripts custom env.
 *  - {String} [cacheDir] - tarball cache store dir, default is `$HOME/.npminstall_tarball`.
 *  	if `production` mode enable, `cacheDir` will be disable.
 *  - {Object} [binaryMirrors] - binary mirror config, default is `{}`
 *  - {Boolean} [ignoreScripts] - ignore pre / post install scripts, default is `false`
 *  - {Array} [forbiddenLicenses] - forbit install packages which used these licenses
 */
module.exports = function* (options) {
  options = formatInstallOptions(options);

  const rootPkgFile = path.join(options.root, 'package.json');
  const rootPkg = yield utils.readJSON(rootPkgFile);
  const displayName = `${rootPkg.name}@${rootPkg.version}`;
  let pkgs = options.pkgs;
  const rootPkgDependencies = dependencies(rootPkg);
  if (pkgs.length === 0) {
    pkgs = options.production ? rootPkgDependencies.prod : rootPkgDependencies.all;
  } else {
    // try to fix no version package from rootPkgDependencies
    const allDeps = rootPkgDependencies.allMap;
    for (const childPkg of pkgs) {
      if (!childPkg.version && allDeps[childPkg.name]) {
        childPkg.version = allDeps[childPkg.name];
        debug('auto fill version: %j', childPkg);
      }
    }
  }

  if (options.installRoot) yield preinstall(rootPkg, options.root, displayName, options);

  const nodeModulesDir = path.join(options.targetDir, 'node_modules');
  yield utils.mkdirp(nodeModulesDir);
  const rootPkgsMap = new Map();
  const tasks = [];
  for (const childPkg of pkgs) {
    childPkg.name = childPkg.name || '';
    rootPkgsMap.set(childPkg.name, true);
    tasks.push(installOne(options.targetDir, childPkg, options));
  }

  yield parallel(tasks, 10);

  spinner.stop();

  const linkTasks = [];
  for (const item of options.latestVersions) {
    const name = item[0];
    const version = item[1];
    if (!rootPkgsMap.has(name)) {
      // link latest package to `storeDir/node_modules`
      linkTasks.push(linkLatestVersion({
        name,
        version,
      }, options.storeDir));
    }
  }

  if (linkTasks.length > 0) {
    yield linkTasks;
  }

  if (options.installRoot) yield postinstall(rootPkg, options.root, false, displayName, options);

  yield runPostInstallTasks(options);

  // local install trigger prepublish when no packages and non-production mode
  // see:
  // - https://docs.npmjs.com/misc/scripts
  // - https://github.com/npm/npm/issues/3059#issuecomment-32057292
  if (options.installRoot && !options.production) yield prepublish(rootPkg, options.root, options);

  if (options.peerDependencies.length > 0) {
    yield options.peerDependencies.map(item => validatePeerDependencies(item, options));
  }

  for (const item of options.paddingMessages) {
    if (options.console[item[0]] && options.console[item[0]] !== debug) {
      options.console[item[0]].apply(options.console, item.slice(1));
    }
  }

  const totalUse = Date.now() - options.start;
  const totalSize = options.totalTarballSize + options.totalJSONSize;
  const avgSpeed = totalSize / totalUse * 1000;
  const logArguments = [
    chalk[options.detail ? 'green' : 'white']('All packages installed (%s%s%s%suse %s, speed %s/s, json %s(%s), tarball %s)'),
    options.registryPackages ? `${options.registryPackages} packages installed from npm registry, ` : '',
    options.remotePackages ? `${options.remotePackages} packages installed from remote url, ` : '',
    options.localPackages ? `${options.localPackages} packages installed from local file, ` : '',
    options.gitPackages ? `${options.gitPackages} packages installed from git, ` : '',
    ms(totalUse), bytes(avgSpeed),
    options.totalJSONCount,
    bytes(options.totalJSONSize),
    bytes(options.totalTarballSize),
  ];
  if (!options.detail) {
    spinner.text = util.format.apply(util, logArguments);
    spinner.succeed();
  } else {
    options.console.info.apply(console, logArguments);
  }

  if (options.recentlyUpdates.size > 0) {
    const since = moment(options.recentlyUpdateMinDateTime).format('YYYY-MM-DD');
    const recentlyUpdatesTextFile = path.join(options.storeDir, '.recently_updates.txt');
    let recentlyUpdatesText = `Recently updated (since ${since})`;
    console.info('%s: %s %s',
      chalk.gray(recentlyUpdatesText),
      `${chalk.green(options.recentlyUpdates.size)} packages`,
      chalk.gray(`(detail see file ${recentlyUpdatesTextFile})`));
    const displays = {};
    for (const item of options.recentlyUpdates) {
      const name = item[0];
      const publishDate = moment(item[1]);
      const key = publishDate.format('YYYY-MM-DD');
      const list = displays[key] || [];
      list.push(`${name} ${chalk.gray(publishDate.format('(HH:mm:ss)'))}`);
      displays[key] = list;
    }

    const today = moment().format('YYYY-MM-DD');
    const keys = Object.keys(displays).sort((a, b) => {
      return a > b ? -1 : 1;
    });

    recentlyUpdatesText += '\n';
    for (const key of keys) {
      const isToday = key === today;
      const label = isToday ? 'Today:' : key;
      const logToConsole = !options.onlyShowTodayUpdateToConsole || (options.onlyShowTodayUpdateToConsole && isToday);
      const text = `  ${label}`;
      recentlyUpdatesText += `${text}\n`;

      logToConsole && console.info(chalk.gray(text));
      const list = displays[key];
      for (const message of list) {
        const text = `    ${chalk.green('→')} ${message}`;
        recentlyUpdatesText += `${text}\n`;

        logToConsole && console.info(text);
      }
    }
    fs.writeFileSync(recentlyUpdatesTextFile, recentlyUpdatesText);
  }
};

function* installOne(parentDir, childPkg, options) {
  if (!(yield needInstall(parentDir, childPkg, options))) {
    options.console.info(
      '%s %s at %s',
      chalk.gray(childPkg.name + '@' + childPkg.version),
      chalk.cyan('existed'),
      path.join(parentDir, 'node_modules', childPkg.name)
    );
    return;
  }

  const res = yield install(parentDir, childPkg, [], options);
  if (res) {
    options.console.info(
      '%s %s at %s',
      chalk.gray(childPkg.name + '@' + childPkg.version),
      res.exists ? chalk.cyan('existed') : chalk.green('installed'),
      path.relative(parentDir, res.dir)
    );
  }
}

function* needInstall(parentDir, childPkg, options) {
  // always install if not install from package.json
  if (!options.installRoot) return true;

  const pkg = yield utils.readJSON(path.join(parentDir, 'node_modules', childPkg.name, 'package.json'));
  try {
    if (pkg.name && pkg.version && childPkg.version) {
      if (semver.validRange(childPkg.version) && semver.satisfies(pkg.version, childPkg.version)) {
        return false;
      }
    }
  } catch (err) {
    // ignore, maybe pkg.version invalid
    debug('[%s@%s] version invalid: %s', pkg.name, pkg.version, err);
  }
  // clean up
  if (childPkg.name) {
    yield utils.rimraf(path.join(parentDir, 'node_modules', childPkg.name));
  }
  return true;
}

function* validatePeerDependencies(params, options) {
  const pkg = params.package;
  const parentDir = params.parentDir;

  const peerDependencies = pkg.peerDependencies;
  const names = Object.keys(peerDependencies);
  const cacheKey = `nodemodule:path:${parentDir}`;
  let paths = options.cache[cacheKey];
  if (!paths) {
    paths = options.cache[cacheKey] = Module._nodeModulePaths(parentDir);
  }
  for (const name of names) {
    const expectVersion = peerDependencies[name];
    const realPkg = yield utils.getPkgFromPaths(name, paths);
    if (!realPkg) {
      options.console.warn(
        '%s %s requires a peer of %s but none was installed',
        chalk.red('peerDependencies WARNING'),
        chalk.gray(params.displayName),
        chalk.yellow(`${name}@${expectVersion}`)
      );
      continue;
    }
    if (!semver.satisfies(realPkg.version, expectVersion)) {
      options.console.warn(
        '%s %s requires a peer of %s but %s was installed',
        chalk.red('peerDependencies WARNING'),
        chalk.gray(params.displayName),
        chalk.yellow(`${name}@${expectVersion}`),
        chalk.yellow(`${name}@${realPkg.version}`)
      );
      continue;
    }
    debug('%s requires a peer of %s and %s was installed at %s',
      chalk.green(params.displayName),
      chalk.green(`${name}@${expectVersion}`),
      chalk.green(`${name}@${realPkg.version}`),
      realPkg.installPath);
  }
}

function* linkLatestVersion(pkg, storeDir) {
  const linkDir = path.join(storeDir, pkg.name);
  if (yield fs.exists(linkDir)) return debug('[linkLatestVersion] %s already exists', linkDir);
  yield utils.mkdirp(path.dirname(linkDir));
  const realDir = utils.getPackageStorePath(storeDir, pkg);
  const relative = yield utils.forceSymlink(realDir, linkDir);
  debug('%s@%s link %s => %s', pkg.name, pkg.version, linkDir, relative);
}

function* runPostInstallTasks(options) {
  if (options.postInstallTasks.length && options.ignoreScripts) {
    console.log(chalk.yellow('ignore all post install scripts'));
    return;
  }

  if (options.postInstallTasks.length) {
    options.console.log(chalk.yellow('execute post install scripts...'));
  }
  for (const task of options.postInstallTasks) {
    const pkg = task.pkg;
    const root = task.root;
    const displayName = task.displayName;
    const donefile = path.join(root, '.npminstall.done');
    const installScript = pkg.scripts.install;
    const postinstallScript = pkg.scripts.postinstall;
    try {
      if (installScript) {
        options.console.log(
          '%s %s run %j',
          chalk.yellow('scripts.install'),
          chalk.gray(displayName),
          installScript
        );
        const start = Date.now();
        yield utils.runScript(root, installScript, options);
        options.console.log(
          '%s %s finished in %s',
          chalk.yellow('scripts.install'),
          chalk.gray(displayName),
          ms(Date.now() - start)
        );
      }
      if (postinstallScript) {
        options.console.log(
          '%s %s run %j',
          chalk.yellow('scripts.postinstall'),
          chalk.gray(displayName),
          postinstallScript
        );
        const start = Date.now();
        yield utils.runScript(root, postinstallScript, options);
        options.console.log(
          '%s %s finished in %s',
          chalk.yellow('scripts.postinstall'),
          chalk.gray(displayName),
          ms(Date.now() - start)
        );
      }
    } catch (err) {
      // If post install execute error, make sure this package won't be skipped during next installation.
      try {
        yield utils.rimraf(donefile);
      } catch (e) {
        options.console.warn(chalk.yellow(`rmdir donefile: ${donefile} error: ${e}, ignore it`));
      }
      if (task.optional) {
        console.warn(chalk.red('%s optional error: %s'), displayName, err.stack);
        return;
      }
      err.message = `post install error, please remove node_modules before retry!\n${err.message}`;
      throw err;
    }
  }
}
