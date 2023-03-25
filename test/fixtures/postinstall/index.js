#!/usr/bin/env node

'use strict';

const path = require('node:path');
const fs = require('node:fs');

console.log({
  cwd: process.cwd(),
  exists: !!require('utility'),
  path: require.resolve('utility'),
  version: require('utility/package.json').version,
  npm_config_argv: process.env.npm_config_argv,
});

let filepath;
if (process.argv[2] === 'preinstall') {
  filepath = path.join(process.cwd(), '.preinstall.txt');
} else {
  // console.log(require('bignum')('782910138827292261791972728324982'));
  filepath = path.join(process.cwd(), 'node_modules', '.' + process.argv[2] + '.txt');
}
fs.writeFileSync(filepath, 'success: ' + process.argv[2]);
