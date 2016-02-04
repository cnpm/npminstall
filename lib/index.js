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
const parallel = require('co-parallel');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const install = require('./install');
const dependencies = require('./dependencies');

module.exports = function*(options) {
  options.events = new EventEmitter();
  // close EventEmitter memory leak warning
  options.events.setMaxListeners(0);
  options.events.await = await;

  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || process.env.npm_registry || 'https://registry.npmjs.com';
  if (!options.storeDir) {
    options.storeDir = path.join(options.root, 'node_modules/.npminstall');
  }
  options.timeout = options.timeout || 60000;
  options.console = options.console || console;
  options.start = Date.now();

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

  installRoot && (yield preinstall(rootPkg, options.root, options));

  const nodeModulesDir = path.join(options.root, 'node_modules');
  yield utils.mkdirp(nodeModulesDir);
  const tasks = [];
  for (const childPkg of pkgs) {
    tasks.push(_install(options.root, childPkg, options));
  }

  yield parallel(tasks, 10);

  installRoot && (yield postinstall(rootPkg, options.root, options));

  options.console.info(chalk.green('All packages installed, use %s'),
    ms(Date.now() - options.start));
};

function* _install(parentDir, childPkg, options) {
  const start = Date.now();
  const realDir = yield install(parentDir, childPkg, options);
  if (realDir) {
    options.console.info('[%s] installed at %s %s',
      chalk.green(childPkg.name + '@' + childPkg.version),
      path.relative(process.cwd(), realDir),
      chalk.cyan(ms(Date.now() - start)));
  }
}
