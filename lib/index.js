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

const debug = require('debug')('npminstall:index');
const assert = require('assert');
const path = require('path');
const ms = require('ms');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const install = require('./install');

module.exports = function*(options) {
  const allStart = Date.now();
  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || process.env.npm_registry || 'https://registry.npmjs.org';
  if (!options.storeDir) {
    options.storeDir = path.join(options.root, '.npminstall');
  }
  options.pkgs = options.pkgs || [];
  options.timeout = options.timeout || 60000;
  const rootPkgFile = path.join(options.root, 'package.json');
  let rootPkg;
  if (yield utils.exists(rootPkgFile)) {
    rootPkg = yield utils.readJSON(rootPkgFile);
  } else {
    rootPkg = {};
  }
  yield preinstall(rootPkg, options.root);

  if (options.pkgs.length === 0) {
    if (rootPkg.dependencies) {
      for (const name in rootPkg.dependencies) {
        options.pkgs.push({
          name: name,
          version: rootPkg.dependencies[name],
        });
      }
    }
    if (rootPkg.devDependencies) {
      for (const name in rootPkg.devDependencies) {
        options.pkgs.push({
          name: name,
          version: rootPkg.devDependencies[name],
        });
      }
    }
  }

  const nodeModulesDir = path.join(options.root, 'node_modules');
  yield utils.mkdirp(nodeModulesDir);
  for (const childPkg of options.pkgs) {
    const childPkgStart = Date.now();
    const childPkgRealDir = yield install(childPkg, options);
    const childPkgDir = path.join(nodeModulesDir, childPkg.name);
    if (childPkg.name[0] === '@') {
      yield utils.mkdirp(path.dirname(childPkgDir));
    }
    const relativeDir = path.relative(path.dirname(childPkgDir), childPkgRealDir);
    yield utils.forceSymlink(relativeDir, childPkgDir);
    debug('[%s@%s] %s, ==> %s',
      childPkg.name, childPkg.version, ms(Date.now() - childPkgStart), relativeDir);
  }

  yield postinstall(rootPkg, options.root);
  debug('Install %d packages use %s', options.pkgs.length, ms(Date.now() - allStart));
};
