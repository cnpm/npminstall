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
const npminstall = require('../');
const npa = require('npm-package-arg');
const chalk = require('chalk');
const path = require('path');
const exec = require('child_process').execSync;
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
const isGlobal = process.argv.indexOf('-g') >= 0;

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
}).catch(function(err) {
  console.error(chalk.red(err));
  console.error(chalk.red(err.stack));
  process.exit(1);
});

function getPrefix() {
  try {
    return exec('npm config get prefix').toString().trim();
  } catch (err) {
    throw new Error(`exec npm config get prefix ERROR: ${err.message}`);
  }
}
