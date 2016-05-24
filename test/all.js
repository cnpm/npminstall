/**
 * install top packages
 *
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

co(function*() {
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
