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
const get = require('./get');
const download = require('./download');
const utils = require('./utils');

module.exports = install;

function* install(pkg, options) {
  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  const key = 'install:' + pkg.name + '@' + pkg.version;
  if (options.cache[key]) {
    return options.cache[key];
  }

  const pkgUrl = url.resolve(options.registry,
    utility.encodeURIComponent(pkg.name) + '/' + utility.encodeURIComponent(pkg.version));
  debug('[%s@%s] GET %j', pkg.name, pkg.version, pkgUrl);
  const result = yield get(pkgUrl, {
    dataType: 'json',
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
  });
  const realPkg = result.data;
  debug('[%s@%s] status %s, real version: %s', pkg.name, pkg.version, result.status, realPkg.version);

  const info = yield download(realPkg, options);
  const pkgRealDir = info.dir;
  options.cache[key] = pkgRealDir;

  if (info.exists) {
    return pkgRealDir;
  }

  // install dependencies
  const names = Object.keys(realPkg.dependencies || {});
  const bundleDependencies = realPkg.bundleDependencies || [];
  if (names.length > 0) {
    const nodeModulesDir = path.join(pkgRealDir, 'node_modules');
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
      tasks.push(installChild(nodeModulesDir, pkg, childPkg, options));
    }
    yield tasks;
  }
  return pkgRealDir;
}

function* installChild(nodeModulesDir, pkg, childPkg, options) {
  const childPkgRealDir = yield install(childPkg, options);
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
  debug('[%s@%s] link node_modules/%s => %s', pkg.name, pkg.version, childPkg.name, relativeDir);
  yield utils.forceSymlink(relativeDir, childPkgDir);
}
