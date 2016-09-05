'use strict';

const co = require('co');
const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');

const names = [
  'strongloop',
  'express', 'koa', 'browserify',
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
];

// test ghost install on node v4
if (/^v4\./.test(process.version)) {
  names.push('ghost');
}

co(function* () {
  const root = path.join(__dirname, 'fixtures', 'all');
  const pkgs = names.map(name => {
    return { name };
  });

  rimraf.sync(root);
  yield npminstall({
    root,
    pkgs,
  });
}).catch(err => {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
