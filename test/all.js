'use strict';

const co = require('co');
const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');

const names = [
  'strongloop',
  'express', 'koa', 'browserify', 'egg',
  'pm2',
  'grunt-cli',
  'npm', 'karma',
  'bower',
  'coffee-script',
  'gulp',
  'forever',
  'grunt', 'less',
  'yo',
  'lodash', 'bluebird', 'async', 'commander',
  'q', 'request', 'debug', 'mkdirp', 'underscore', 'chalk', 'colors',
  'webpack',
  'antd',
  'cnpm',
  'pnpm',
  'firebase',
];

// test ghost install on node 4, 6
// if (/^v(4|6)\./.test(process.version)) {
//   names.push({ name: 'ghost', version: '0' });
// }

co(function* () {
  const root = path.join(__dirname, 'fixtures', 'all');
  const pkgs = names.map(name => {
    if (typeof name === 'string') return { name };
    return name;
  });

  rimraf.sync(root);
  yield npminstall({
    root,
    pkgs,
    detail: true,
  });
}).catch(err => {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
