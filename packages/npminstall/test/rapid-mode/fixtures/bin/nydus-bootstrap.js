#!/usr/bin/env node
'use strict';

const fs = require('fs');
const args = process.argv;

const stargzConfigPath = args[2].match(/--stargz-config-path=(.+)/)[1];
const stargzDir = args[3].match(/--stargz-dir=(.+)/)[1];
const bootstrap = args[4].match(/--bootstrap=(.+)/)[1];

if (!fs.existsSync(stargzConfigPath)) {
  throw new Error(`${stargzConfigPath} not exits`);
}

if (!fs.existsSync(stargzDir)) {
  throw new Error(`${stargzDir} not exits`);
}

fs.writeFileSync(bootstrap, 'mock_bootstrap');

process.exit(0);
