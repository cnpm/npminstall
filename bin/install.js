#!/usr/bin/env node

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

const co = require('co');
const npa = require('npm-package-arg');
const chalk = require('chalk');
const path = require('path');
const execSync = require('child_process').execSync;
const fs = require('mz/fs');
const utils = require('../lib/utils');
const npminstall = require('../');

const names = process.argv.slice(2);
const pkgs = [];

for (const name of names) {
  // ignore --production
  if (name.indexOf('-') === 0) {
    continue;
  }
  const p = npa(name);
  pkgs.push({ name: p.name, version: p.rawSpec });
}

const root = process.cwd();
const registry = process.env.npm_registry || 'https://registry.npm.taobao.org';
const production = process.argv.indexOf('--production') > 0 || process.env.NODE_ENV === 'production';
const cacheDir = process.argv.indexOf('--no-cache') > 0 ? '' : null;
const isGlobal = process.argv.indexOf('-g') >= 0 || process.argv.indexOf('--global') >= 0;

if (process.argv.indexOf('-v') > 0 || process.argv.indexOf('--version') > 0) {
  console.log('v%s', require('../package.json').version);
  process.exit(0);
}

co(function*() {
  const config = {
    root,
    registry,
    pkgs,
    production,
    cacheDir,
  };
  // -g install to npm's global prefix
  if (isGlobal) {
    const npmPrefix = getPrefix();
    config.targetDir = path.join(npmPrefix, 'lib');
    config.binDir = path.join(npmPrefix, 'bin');
  }
  yield npminstall(config);

  if (!isGlobal && pkgs.length > 0) {
    // support --save, --save-dev and --save-optional
    if (process.argv.indexOf('--save') >= 0) {
      yield updateDependencies(root, pkgs, 'dependencies');
    } else if (process.argv.indexOf('--save-dev') >= 0) {
      yield updateDependencies(root, pkgs, 'devDependencies');
    } else if (process.argv.indexOf('--save-optional') >= 0) {
      yield updateDependencies(root, pkgs, 'optionalDependencies');
    }
  }
}).catch(function(err) {
  console.error(chalk.red(err));
  console.error(chalk.red(err.stack));
  process.exit(1);
});

function getPrefix() {
  try {
    return execSync('npm config get prefix').toString().trim();
  } catch (err) {
    throw new Error(`exec npm config get prefix ERROR: ${err.message}`);
  }
}

function getVersionSavePrefix() {
  try {
    return execSync('npm config get save-prefix').toString().trim();
  } catch (err) {
    console.error(`exec npm config get save-prefix ERROR: ${err.message}`);
    return '^';
  }
}

function* updateDependencies(root, pkgs, propName) {
  const savePrefix = getVersionSavePrefix();
  const pkgFile = path.join(root, 'package.json');
  const pkg = yield utils.readJSON(pkgFile);
  const deps = pkg[propName] = pkg[propName] || {};
  for (const item of pkgs) {
    const itemPkg = yield utils.readJSON(path.join(root, 'node_modules', item.name, 'package.json'));
    deps[item.name] = `${savePrefix}${itemPkg.version}`;
  }
  yield fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2));
}
