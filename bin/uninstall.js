#!/usr/bin/env node

'use strict';

const debug = require('debug')('npminstall:bin:uninstall');
const npa = require('npm-package-arg');
const co = require('co');
const path = require('path');
const fs = require('mz/fs');
const parseArgs = require('minimist');
const chalk = require('chalk');

const utils = require('../lib/utils');
const uninstall = require('../lib/uninstall');

const argv = parseArgs(process.argv.slice(2), {
  string: [
    'root',
  ],
  boolean: [
    'version',
    'help',
    'save',
    'save-dev',
    'save-optional',
    'ignore-scripts',
  ],
  alias: {
    v: 'version',
    h: 'help',
    S: 'save',
    D: 'save-dev',
    O: 'save-optional',
  },
});

if (argv.version) {
  console.log('v%s', require('../package.json').version);
  process.exit(0);
}

if (argv.help) help();

const pkgs = [];

for (const name of argv._) {
  const p = npa(String(name));
  pkgs.push({ name: p.name, version: p.rawSpec });
}

if (!pkgs.length) help();

co(function* () {
  const root = argv.root || process.cwd();
  const config = {
    root,
    pkgs,
    ignoreScripts: argv['ignore-scripts'],
  };
  debug('uninstall in %s with $j', root, pkgs);
  const uninstalled = yield uninstall(config);
  if (uninstalled.length > 0) {
    // support --save, --save-dev and --save-optional
    if (argv.save) {
      yield updateDependencies(root, pkgs, 'dependencies');
    } else if (argv['save-dev']) {
      yield updateDependencies(root, pkgs, 'devDependencies');
    } else if (argv['save-optional']) {
      yield updateDependencies(root, pkgs, 'optionalDependencies');
    }
  }
  yield updateDependencies(root, uninstalled);
}).catch(function(err) {
  console.error(chalk.red(err));
  console.error(chalk.red(err.stack));
  process.exit(1);
});

function* updateDependencies(root, pkgs, propName) {
  const pkgFile = path.join(root, 'package.json');
  const pkg = yield utils.readJSON(pkgFile);
  const deps = pkg[propName];
  if (!deps) return;

  for (const pkg of pkgs) {
    delete deps[pkg.name];
  }

  yield fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2));
}

function help() {
  console.log(
`
Usage:

  npmuninstall <pkg>
  npmuninstall <pkg>@<version>
  npmuninstall <pkg>@<version> [<pkg>@<version>]
`
  );
  process.exit(0);
}
