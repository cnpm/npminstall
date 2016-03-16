/**
 * impl npm install [pkg1, pkg2, ...]
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('npminstall:index');
const EventEmitter = require('events');
const chalk = require('chalk');
const assert = require('assert');
const path = require('path');
const ms = require('ms');
const await = require('await-event');
const parallel = require('co-parallel');
const semver = require('semver');
const bytes = require('bytes');
const Module = require('module');
const fs = require('mz/fs');
const os = require('os');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const prepublish = require('./prepublish');
const install = require('./install');
const dependencies = require('./dependencies');
/**
 * npm install
 * @param {Object} options - install options
 *  - {String} root - npm install root dir
 *  - {String} [registry] - npm registry url, default is `https://registry.npmjs.com`
 *  - {String} [targetDir] - node_modules target dir, default is ${root}.
 *  - {String} [storeDir] - npm modules store dir, default is `${targetDir}/node_modules/.npminstall`
 *  - {Number} [timeout] - npm registry request timeout, default is 60000 ms
 *  - {Console} [console] - console logger instance, default is `console`
 *  - {Array<Object>} [pkgs] - optional packages to install, default is `[]`
 *  - {Boolean} [production] - production mode install, default is `false`
 *  - {Object} [env] - postinstall and preinstall scripts custom env.
 *  - {String} [cacheDir] - tarball cache store dir, default is `$HOME/.npminstall_tarball`.
 *  	if `production` mode enable, `cacheDir` will be disable.
 *  - {Object} [binaryMirrors] - binary mirror config, default is `{}`
 */
module.exports = function*(options) {
  options.events = new EventEmitter();
  // close EventEmitter memory leak warning
  options.events.setMaxListeners(0);
  options.events.await = await;

  options.postInstallTasks = [];
  // [
  //    {package: pkg, parentDir: 'parentDir', packageDir: 'packageDir'},
  //   ...
  // ]
  options.peerDependencies = [];
  // {
  //   $name: $latestVersion
  // }
  options.latestVersions = new Map();
  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || 'https://registry.npmjs.com';
  if (!options.targetDir) {
    options.targetDir = options.root;
  }
  if (!options.storeDir) {
    options.storeDir = path.join(options.targetDir, 'node_modules/.npminstall');
  }
  options.timeout = options.timeout || 60000;
  options.console = options.console || console;
  options.env = options.env || {};
  options.start = Date.now();
  options.totalTarballSize = 0;
  options.totalJSONSize = 0;
  options.totalJSONCount = 0;
  options.downloadPackages = 0;
  options.localPackages = 0;
  options.remotePackages = 0;
  options.registryPackages = 0;
  options.gitPackages = 0;
  options.binaryMirrors = options.binaryMirrors || {};
  if (options.production) {
    options.cacheDir = '';
  } else {
    if (typeof options.cacheDir !== 'string') {
      options.cacheDir = path.join(os.homedir(), '.npminstall_tarball');
    }
  }

  debug('options: %j', options);

  const rootPkgFile = path.join(options.root, 'package.json');
  const rootPkg = yield utils.readJSON(rootPkgFile);
  let pkgs = options.pkgs || [];
  let installRoot = false;
  if (pkgs.length === 0) {
    installRoot = true;
    pkgs = options.production
      ? dependencies(rootPkg).prod
      : dependencies(rootPkg).all;
  }

  if (installRoot) yield preinstall(rootPkg, options.root, options);

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

  const linkTasks = [];
  for (const item of options.latestVersions) {
    const name = item[0];
    const version = item[1];
    if (rootPkgsMap.has(name)) {
      // link root package to `storeDir/node_modules`
      linkTasks.push(linkRootPackage(name, nodeModulesDir, options.storeDir));
    } else {
      // link latest package to `storeDir/node_modules`
      linkTasks.push(linkLatestVersion({
        name: name,
        version: version,
      }, options.storeDir));
    }
  }
  yield linkTasks;

  if (installRoot) yield postinstall(rootPkg, options.root, false, options);

  yield runPostInstallTasks(options);
  if (installRoot) yield prepublish(rootPkg, options.root, options);

  if (options.peerDependencies.length > 0) {
    yield options.peerDependencies.map(item => validatePeerDependencies(item, options));
  }

  const totalUse = Date.now() - options.start;
  const totalSize = options.totalTarballSize + options.totalJSONSize;
  const avgSpeed = totalSize / totalUse * 1000;
  options.console.info(
    chalk.green('All packages installed (%s%s%s%suse %s, speed %s/s, json %s(%s), tarball %s)'),
    options.registryPackages ? `${options.registryPackages} packages installed from npm registry, ` : '',
    options.remotePackages ? `${options.remotePackages} packages installed from remote url, ` : '',
    options.localPackages ? `${options.localPackages} packages installed from local file, ` : '',
    options.gitPackages ? `${options.gitPackages} packages installed from git, ` : '',
    ms(totalUse), bytes(avgSpeed),
    options.totalJSONCount,
    bytes(options.totalJSONSize),
    bytes(options.totalTarballSize));
};

function* installOne(parentDir, childPkg, options) {
  const start = Date.now();
  if (!(yield needInstall(parentDir, childPkg))) {
    options.console.info('[%s] %s at %s',
      chalk.green(childPkg.name + '@' + childPkg.version),
      chalk.gray('existed'),
      path.join(parentDir, 'node_modules', childPkg.name));
    return;
  }

  const res = yield install(parentDir, childPkg, options);
  if (res) {
    const totalUse = Date.now() - options.start;
    const totalSize = options.totalTarballSize + options.totalJSONSize;
    const avgSpeed = totalSize / totalUse * 1000;
    options.console.info('[%s] %s at %s (%s packages, use %s, speed %s/s, json %s, tarball %s)',
      chalk.green(childPkg.name + '@' + childPkg.version),
      res.exists ? chalk.gray('existed') : chalk.green('installed'),
      path.relative(parentDir, res.dir),
      chalk.cyan(options.downloadPackages),
      chalk.cyan(ms(Date.now() - start)),
      chalk.cyan(bytes(avgSpeed)),
      chalk.cyan(bytes(options.totalJSONSize)),
      chalk.cyan(bytes(options.totalTarballSize)));
  }
}

function* needInstall(parentDir, childPkg) {
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
  const packageDir = params.packageDir;

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
      options.console.warn('%s [%s] in %s requires a peer of %s but none was installed',
        chalk.yellow.bold('peerDependencies WARNING'),
        chalk.red(`${pkg.name}@${pkg.version}`),
        chalk.gray(packageDir),
        chalk.yellow(`${name}@${expectVersion}`));
      continue;
    }
    if (!semver.satisfies(realPkg.version, expectVersion)) {
      options.console.warn('%s [%s] in %s requires a peer of %s but %s was installed',
        chalk.yellow.bold('peerDependencies WARNING'),
        chalk.red(`${pkg.name}@${pkg.version}`),
        chalk.gray(packageDir),
        chalk.yellow(`${name}@${expectVersion}`),
        chalk.yellow(`${name}@${realPkg.version}`));
      continue;
    }
    debug('[%s] requires a peer of %s and %s was installed at %s',
      chalk.green(`${pkg.name}@${pkg.version}`),
      chalk.green(`${name}@${expectVersion}`),
      chalk.green(`${name}@${realPkg.version}`),
      realPkg.installPath);
  }
}

function* linkLatestVersion(pkg, storeDir) {
  const parentDir = path.join(storeDir, 'node_modules');
  const linkDir = path.join(parentDir, pkg.name);
  yield utils.mkdirp(path.dirname(linkDir));
  const realDir = utils.getPackageStorePath(storeDir, pkg);
  const relative = yield utils.forceSymlink(realDir, linkDir);
  debug('%s@%s link %s => %s', pkg.name, pkg.version, linkDir, relative);
}

function* linkRootPackage(name, nodeModulesDir, storeDir) {
  const linkDir = path.join(storeDir, 'node_modules', name);
  const realDir = yield fs.realpath(path.join(nodeModulesDir, name));
  yield utils.mkdirp(path.dirname(linkDir));
  const relative = yield utils.forceSymlink(realDir, linkDir);
  debug('root pacakge %s link %s => %s', name, linkDir, relative);
}

function* runPostInstallTasks(options) {
  if (options.postInstallTasks.length) {
    options.console.log(chalk.yellow('excute post install scripts...'));
  }
  for (const task of options.postInstallTasks) {
    const pkg = task.pkg;
    const root = task.root;
    const installScript = pkg.scripts.install;
    const postinstallScript = pkg.scripts.postinstall;
    try {
      if (installScript) {
        options.console.log(chalk.yellow('[%s@%s] scripts.install: %j at %s'),
          pkg.name, pkg.version, installScript, root);
        const start = Date.now();
        yield utils.runScript(root, installScript, options);
        options.console.log(chalk.yellow('[%s@%s] scripts.install success, use %s'),
          pkg.name, pkg.version, ms(Date.now() - start));
      }
      if (postinstallScript) {
        options.console.log(chalk.yellow('[%s@%s] scripts.postinstall: %j at %s'),
          pkg.name, pkg.version, postinstallScript, root);
        const start = Date.now();
        yield utils.runScript(root, postinstallScript, options);
        options.console.log(chalk.yellow('[%s@%s] scripts.postinstall success, use %s'),
          pkg.name, pkg.version, ms(Date.now() - start));
      }
    } catch (err) {
      if (task.optional) {
        return console.warn(chalk.red('[%s@%s] optional error: %s'), err.stack);
      }
      err.message = `post install error, please remove node_modules before retry!\n${err.message}`;
      throw err;
    }
  }
}
