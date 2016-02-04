/**
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

const debug = require('debug')('npminstall:install');
const path = require('path');
const url = require('url');
const utility = require('utility');
const npa = require('npm-package-arg');
const chalk = require('chalk');
const get = require('./get');
const download = require('./download');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const bin = require('./bin');
const link = require('./link');
const dependencies = require('./dependencies');

module.exports = install;

function* install(parentDir, pkg, options) {
  try {
    return yield _install(parentDir, pkg, options);
  } catch (err) {
    if (pkg.optional) {
      options.console.error(chalk.red(`[${pkg.name}@${pkg.version}] optional install error:`));
      options.console.error(err.stack);
    } else {
      throw err;
    }
  }
}

function* _install(parentDir, pkg, options) {
  debug('install %s@%s in %s', pkg.name, pkg.version, parentDir);
  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  const p = npa(pkg.name + '@' + pkg.version);
  if (!p || p.type === 'remote' || p.type === 'git') {
    console.error(chalk.red(`${pkg.name}@${pkg.version}] package is not supported yet, type: ${p.type}`));
    return '';
  }

  const key = `install:${pkg.name}@${pkg.version}`;
  const c = options.cache[key]; // {package: packageInfo, dir: realDir}
  if (c) {
    const pkg = c.package;
    const dir = c.dir;
    yield bin(parentDir, pkg, dir);
    yield link(parentDir, pkg, dir);
    return dir;
  }

  // get npm package info
  const pkgUrl = getPackageNpmUri(pkg, options);
  const result = yield get(pkgUrl, {
    dataType: 'json',
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
  });
  const realPkg = result.data;
  debug('[%s@%s] status %s, real version: %s, headers: %j',
    pkg.name, pkg.version, result.status, realPkg.version, result.headers);

  // download tarball and unzip
  const info = yield download(realPkg, options);
  const realPkgDir = info.dir;
  options.cache[key] = {
    package: realPkg,
    dir: realPkgDir,
  };

  if (info.exists) {
    // make sure bins will be links to ${parentDir}/node_modules/.bin
    yield bin(parentDir, realPkg, realPkgDir);
    yield link(parentDir, realPkg, realPkgDir);
    return realPkgDir;
  }

  if (realPkg.deprecated) {
    console.warn('[%s] %s: %s',
      chalk.red(`${realPkg.name}@${realPkg.version}`), chalk.magenta('deprecate'), realPkg.deprecated);
  }

  // install steps:
  // 1. pre install script
  // 2. install dependencies (don't install bundleDependencies, but need link)
  // 3. post install script
  // 4. link bin files
  // 5. link package to node_modules dir

  try {
    yield preinstall(realPkg, realPkgDir, options);
    // link bundleDependencies' bin
    // npminstall fsevents
    const bundleDependencies = realPkg.bundleDependencies || [];
    yield bundleDependencies.map(name => bundleBin(name, realPkgDir));

    const pkgs = dependencies(realPkg).prod;
    if (pkgs.length > 0) {
      const nodeModulesDir = path.join(realPkgDir, 'node_modules');
      yield utils.mkdirp(nodeModulesDir);
      const tasks = [];
      for (const childPkg of pkgs) {
        if (bundleDependencies.indexOf(childPkg.name) !== -1) {
          continue;
        }
        tasks.push(install(realPkgDir, childPkg, options));
      }
      yield tasks;
    }
    yield postinstall(realPkg, realPkgDir, options);
  } catch (err) {
    // clean up when install error, make sure next time install won't success.
    debug('[%s@%s] install error, clean up %s', realPkg.name, realPkg.version, realPkgDir);
    yield utils.rimraf(realPkgDir);
    throw err;
  }
  yield bin(parentDir, realPkg, realPkgDir);
  yield link(parentDir, realPkg, realPkgDir);
  debug('[%s@%s] installed', realPkg.name, realPkg.version);
  return realPkgDir;
}

function* bundleBin(name, parentDir) {
  const pkgDir = path.join(parentDir, 'node_modules', name);
  const pkgfile = path.join(pkgDir, 'package.json');
  const pkg = yield utils.readJSON(pkgfile);
  yield bin(parentDir, pkg, pkgDir);
}

function getPackageNpmUri(pkg, options) {
  let name = pkg.name;
  if (name[0] === '@') {
    // dont encodeURIComponent @ char, it will be 405
    // https://registry.npmjs.org/%40rstacruz%2Ftap-spec/%3E%3D4.1.1
    name = '@' + utility.encodeURIComponent(name.substring(1));
  } else {
    name = utility.encodeURIComponent(name);
  }
  const pkgUrl = url.resolve(options.registry, name + '/' + utility.encodeURIComponent(pkg.version));
  debug('[%s@%s] GET %j', pkg.name, pkg.version, pkgUrl);
  return pkgUrl;
}
