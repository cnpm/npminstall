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

module.exports = install;

function* install(pkg, options) {
  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  const p = npa(pkg.name + '@' + pkg.version);
  if (!p || p.type === 'remote' || p.type === 'git') {
    console.error(chalk.red('[%s@%s] package is not supported yet, type: %s'),
      pkg.name, pkg.version, p.type);
    return '';
  }

  const key = 'install:' + pkg.name + '@' + pkg.version;
  if (options.cache[key]) {
    return options.cache[key];
  }

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
  const result = yield get(pkgUrl, {
    dataType: 'json',
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
  });
  const realPkg = result.data;
  debug('[%s@%s] status %s, real version: %s, headers: %j',
    pkg.name, pkg.version, result.status, realPkg.version, result.headers);

  const info = yield download(realPkg, options);
  const realPkgDir = info.dir;
  options.cache[key] = realPkgDir;

  if (info.exists) {
    return realPkgDir;
  }

  yield preinstall(realPkg, realPkgDir, options);
  // install dependencies
  const names = Object.keys(realPkg.dependencies || {});
  const bundleDependencies = realPkg.bundleDependencies || [];
  if (names.length > 0) {
    const nodeModulesDir = path.join(realPkgDir, 'node_modules');
    yield utils.mkdirp(nodeModulesDir);
    const tasks = [];
    for (const name of names) {
      if (bundleDependencies.indexOf(name) !== -1) {
        continue;
      }
      const childPkg = {
        name: name,
        version: realPkg.dependencies[name],
      };
      tasks.push(installChild(nodeModulesDir, realPkg, childPkg, options));
    }
    yield tasks;
  }

  yield postinstall(realPkg, realPkgDir, options);
  return realPkgDir;
}

function* installChild(nodeModulesDir, parentPkg, childPkg, options) {
  const childPkgRealDir = yield install(childPkg, options);
  if (!childPkgRealDir) {
    // TODO: support github
    return;
  }
  const childPkgDir = path.join(nodeModulesDir, childPkg.name);
  const stat = yield utils.forceStat(childPkgDir);
  if (stat && stat.isDirectory()) {
    // bundledDependencies like node-pre-gyp@0.6.19, ignore it
    return;
  }
  if (childPkg.name[0] === '@') {
    yield utils.mkdirp(path.dirname(childPkgDir));
  }
  const relativeDir = path.relative(path.dirname(childPkgDir), childPkgRealDir);
  debug('[%s@%s] link node_modules/%s => %s', parentPkg.name, parentPkg.version, childPkg.name, relativeDir);
  yield utils.forceSymlink(relativeDir, childPkgDir);
}
