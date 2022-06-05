#!/usr/bin/env node

'use strict';

const path = require('path');
const parseArgs = require('minimist');
const { rimraf } = require('../lib/utils');

function help(root) {
  console.log(`
Usage:

  npmupdate [--root=${root}]
`
  );
  process.exit(0);
}

(async () => {
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

  const root = argv.root || process.cwd();
  if (argv.help) return help(root);
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
