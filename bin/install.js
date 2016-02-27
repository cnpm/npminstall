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
const parseArgs = require('minimist');
const utils = require('../lib/utils');
const npminstall = require('../');

const argv = parseArgs(process.argv.slice(2), {
  string: [
    'root',
    'registry',
  ],
  boolean: [
    'version',
    'production',
    'global',
    'save',
    'save-dev',
    'save-optional',
  ],
  alias: {
    v: 'version',
    g: 'global',
  },
});

if (argv.version) {
  console.log('v%s', require('../package.json').version);
  process.exit(0);
}

const pkgs = [];

for (const name of argv._) {
  const p = npa(String(name));
  pkgs.push({ name: p.name, version: p.rawSpec });
}

const root = argv.root || process.cwd();
const registry = argv.registry || process.env.npm_registry || 'https://registry.npm.taobao.org';
const production = argv.production || process.env.NODE_ENV === 'production';
let cacheDir = argv.cache === false ? '' : null;
if (production) {
  cacheDir = '';
}

const env = {
  npm_registry: registry,
};

// npm cli will auto set options to npm_xx env.
for (const key in argv) {
  const value = argv[key];
  if (value && typeof value === 'string') {
    env['npm_config_' + key] = value;
  }
}

co(function*() {
  const config = {
    root,
    registry,
    pkgs,
    production,
    cacheDir,
    env,
  };
  // -g install to npm's global prefix
  if (argv.global) {
    const npmPrefix = getPrefix();
    config.targetDir = path.join(npmPrefix, 'lib');
    config.binDir = path.join(npmPrefix, 'bin');
  }
  yield npminstall(config);

  if (!argv.global && pkgs.length > 0) {
    // support --save, --save-dev and --save-optional
    if (argv.save) {
      yield updateDependencies(root, pkgs, 'dependencies');
    } else if (argv['save-dev']) {
      yield updateDependencies(root, pkgs, 'devDependencies');
    } else if (argv['save-optional']) {
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
