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
const utils = require('./utils');
const install = require('./install');

module.exports = function*(options) {
  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || process.env.npm_registry || 'https://registry.npmjs.org';
  if (!options.storeDir) {
    options.storeDir = path.join(options.root, '.npminstall');
  }
  options.pkgs = options.pkgs || [];
  options.timeout = options.timeout || 60000;
  if (options.pkgs.length === 0) {
    const pkg = yield utils.readJSON(path.join(options.root, 'package.json'));
    if (pkg.dependencies) {
      for (const name in pkg.dependencies) {
        options.pkgs.push({
          name: name,
          version: pkg.dependencies[name],
        });
      }
    }
    if (pkg.devDependencies) {
      for (const name in pkg.devDependencies) {
        options.pkgs.push({
          name: name,
          version: pkg.devDependencies[name],
        });
      }
    }
  }

  const nodeModulesDir = path.join(options.root, 'node_modules');
  yield utils.mkdirp(nodeModulesDir);
  for (const pkg of options.pkgs) {
    const pkgRealDir = yield install(pkg, options);
    const pkgDir = path.join(nodeModulesDir, pkg.name);
    const relativeDir = path.relative(path.dirname(pkgDir), pkgRealDir);
    debug('[%s@%s] link %s => %s', pkg.name, pkg.version, pkgDir, relativeDir);
    yield utils.forceSymlink(relativeDir, pkgDir);
  }
};
