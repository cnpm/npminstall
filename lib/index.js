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

const EventEmitter = require('events');
const chalk = require('chalk');
const assert = require('assert');
const path = require('path');
const ms = require('ms');
const await = require('await-event');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const install = require('./install');
const parallel = require('co-parallel');

module.exports = function*(options) {
  options.events = new EventEmitter();
  options.events.await = await;

  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || process.env.npm_registry || 'https://registry.npmjs.com';
  if (!options.storeDir) {
    options.storeDir = path.join(options.root, 'node_modules/.npminstall');
  }
  options.pkgs = options.pkgs || [];
  options.timeout = options.timeout || 60000;
  options.console = options.console || console;
  options.start = Date.now();

  const rootPkgFile = path.join(options.root, 'package.json');
  const rootPkg = yield utils.readJSON(rootPkgFile);
  yield preinstall(rootPkg, options.root, options);

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
  const tasks = [];
  for (const childPkg of options.pkgs) {
    tasks.push(_install(options.root, childPkg, options));
  }

  yield parallel(tasks, 10);

  yield postinstall(rootPkg, options.root, options);
  options.console.info(chalk.green('All packages installed, use %s'),
    ms(Date.now() - options.start));
};

function* _install(parentDir, childPkg, options) {
  const start = Date.now();
  const childPkgRealDir = yield install(parentDir, childPkg, options);
  if (!childPkgRealDir) {
    // TODO
    return;
  }
  const childPkgDir = path.join(parentDir, 'node_modules', childPkg.name);
  if (childPkg.name[0] === '@') {
    yield utils.mkdirp(path.dirname(childPkgDir));
  }
  const relativeDir = path.relative(path.dirname(childPkgDir), childPkgRealDir);
  yield utils.forceSymlink(relativeDir, childPkgDir);
  options.console.info('[%s] installed %s@ -> %s %s',
    chalk.green(childPkg.name + '@' + childPkg.version),
    chalk.magenta(childPkg.name),
    relativeDir,
    chalk.cyan(ms(Date.now() - start)));
}
