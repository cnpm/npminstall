#!/usr/bin/env node

'use strict';

const path = require('path');
const rimraf = require('mz-modules/rimraf');
const parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2), {
  string: [
    'root',
  ],
  boolean: [
    'help',
  ],
  alias: {
    h: 'help',
  },
});

if (argv.help) return help();

const root = argv.root || process.cwd();

function help() {
  console.log(`
Usage:

  npmupdate [--root=${root}]
`
  );
  process.exit(0);
}

(async () => {
  const nodeModules = path.join(root, 'node_modules');
  console.log('[npmupdate] removing %s', nodeModules);
  await rimraf(nodeModules);
  console.log('[npmupdate] reinstall on %s', root);

  // make sure install ignore all package names
  process.env.NPMINSTALL_BY_UPDATE = 'true';
  require('./install');
})().catch(err => {
  console.error(err);
  process.exit(-1);
});
