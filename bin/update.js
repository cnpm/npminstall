#!/usr/bin/env node

'use strict';

const path = require('path');
const rimraf = require('rimraf');
const parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2), {
  string: [
    'root',
  ],
  boolean: [
    'help',
    'global',
  ],
  alias: {
    h: 'help',
    g: 'global',
  },
});

const root = argv.root || process.cwd();

if (argv.help) return help();

if (!argv.global) { // local mode needs to be removed node_modules
  const nodeModules = path.join(root, 'node_modules');
  console.log('[npmupdate] removing %s', nodeModules);
  rimraf.sync(nodeModules);
  console.log('[npmupdate] reinstall on %s', root);

  // make sure install ignore all package names
  process.env.NPMINSTALL_BY_UPDATE_LOCAL = 'true';
}
require('./install');

function help() {
  console.log(
`
Usage:

  npmupdate [--root=${root}]

  -g, --global: update devDependencies to global directory which specified in '$npm config get prefix'
`
  );
  process.exit(0);
}
