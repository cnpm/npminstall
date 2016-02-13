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
const EventEmitter = require('events');
const chalk = require('chalk');
const assert = require('assert');
const path = require('path');
const ms = require('ms');
const await = require('await-event');
const parallel = require('co-parallel');
const semver = require('semver');
const bytes = require('bytes');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const install = require('./install');
const dependencies = require('./dependencies');

/**
 * npm install
 * @param {Object} options - install options
 *  - {String} root - npm install root dir
 *  - {String} registry - npm registry url, default is `https://registry.npmjs.com`
 *  - {String} storeDir - npm modules store dir, default is `${root}/node_modules/.npminstall`
 *  - {Number} [timeout] - npm registry request timeout, default is 60000 ms
 *  - {Console} [console] - console logger instance, default is `console`
 *  - {Array<Object>} [pkgs] - optional packages to install, default is `[]`
 *  - {Boolean} [production] - production mode install, default is `false`
 */
module.exports = function*(options) {
  options.events = new EventEmitter();
  // close EventEmitter memory leak warning
  options.events.setMaxListeners(0);
  options.events.await = await;

  // [
  //   [ pkg, parentDir ],
  //   ...
  // ]
  options.peerDependencies = [];
  // {
  //   $name: $latestVersion
  // }
  options.latestVersions = new Map();
  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || process.env.npm_registry || 'https://registry.npmjs.com';
  if (!options.storeDir) {
    options.storeDir = path.join(options.root, 'node_modules/.npminstall');
  }
  options.timeout = options.timeout || 60000;
  options.console = options.console || console;
  options.start = Date.now();
  options.totalResponseSize = 0;

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

  const nodeModulesDir = path.join(options.root, 'node_modules');
  yield utils.mkdirp(nodeModulesDir);
  const rootPkgsMap = new Map();
  const tasks = [];
  for (const childPkg of pkgs) {
    rootPkgsMap.set(childPkg.name, true);
    tasks.push(installOne(options.root, childPkg, options));
  }

  yield parallel(tasks, 10);

  const linkTasks = [];
  for (const item of options.latestVersions) {
    // don't link root package to `storeDir/node_modules`
    if (rootPkgsMap.has(item[0])) {
      continue;
    }
    linkTasks.push(linkLatestVersion({
      name: item[0],
      version: item[1],
    }, options.storeDir));
  }
  yield linkTasks;

  if (installRoot) yield postinstall(rootPkg, options.root, options);

  if (options.peerDependencies.length > 0) {
    yield options.peerDependencies.map(item => validatePeerDependencies(item[0], item[1]));
  }

  const totalUse = Date.now() - options.start;
  const avgSpeed = options.totalResponseSize / totalUse * 1000;
  options.console.info(chalk.green('All packages installed (use %s, avg speed %s/s, total response %s)'),
    ms(totalUse), bytes(avgSpeed), bytes(options.totalResponseSize));
};

function* installOne(parentDir, childPkg, options) {
  const start = Date.now();
  const realDir = yield install(parentDir, childPkg, options);
  if (realDir) {
    const totalUse = Date.now() - options.start;
    const avgSpeed = options.totalResponseSize / totalUse * 1000;
    options.console.info('[%s] installed at %s (use %s, avg speed %s/s, total response %s)',
      chalk.green(childPkg.name + '@' + childPkg.version),
      path.relative(options.root, realDir),
      chalk.cyan(ms(Date.now() - start)),
      chalk.cyan(bytes(avgSpeed)),
      chalk.cyan(bytes(options.totalResponseSize)));
  }
}

function* validatePeerDependencies(pkg, parentDir) {
  const peerDependencies = pkg.peerDependencies;
  const names = Object.keys(peerDependencies);
  for (const name of names) {
    const expectVersion = peerDependencies[name];
    const realPkg = yield utils.readJSON(path.join(parentDir, 'node_modules', name, 'package.json'));
    if (!realPkg.name) {
      console.warn('%s [%s] requires a peer of %s but none was installed at %s.',
        chalk.yellow.bold('peerDependencies WARNING'),
        chalk.red(`${pkg.name}@${pkg.version}`),
        chalk.yellow(`${name}@${expectVersion}`),
        chalk.yellow(parentDir));
      continue;
    }
    if (!semver.satisfies(realPkg.version, expectVersion)) {
      console.warn('%s [%s] requires a peer of %s but %s was installed at %s.',
        chalk.yellow.bold('peerDependencies WARNING'),
        chalk.red(`${pkg.name}@${pkg.version}`),
        chalk.yellow(`${name}@${expectVersion}`),
        chalk.yellow(`${name}@${realPkg.version}`),
        chalk.yellow(parentDir));
      continue;
    }
    debug('[%s] requires a peer of %s and %s was installed at %s',
      chalk.green(`${pkg.name}@${pkg.version}`),
      chalk.green(`${name}@${expectVersion}`),
      chalk.green(`${name}@${realPkg.version}`),
      parentDir);
  }
}

function* linkLatestVersion(pkg, storeDir) {
  const parentDir = path.join(storeDir, 'node_modules');
  yield utils.mkdirp(parentDir);
  const linkDir = path.join(parentDir, pkg.name);
  const realDir = path.join(storeDir, pkg.name, pkg.version);
  const relative = yield utils.forceSymlink(realDir, linkDir);
  debug('%s@%s link %s => %s', pkg.name, pkg.version, linkDir, relative);
}
