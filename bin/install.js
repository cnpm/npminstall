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
const npminstall = require('../');
const npa = require('npm-package-arg');
const names = process.argv.slice(2);
const pkgs = [];

for (const name of names) {
  // ignore --production
  if (name.indexOf('-') === 0) {
    continue;
  }
  const p = npa(name);
  pkgs.push({ name: p.name, version: p.spec });
}

const root = process.cwd();
const registry = process.env.npm_registry || 'https://registry.npm.taobao.org';
const production = process.argv.indexOf('--production') > 0;

co(function*() {
  yield npminstall({
    root,
    registry,
    pkgs,
    production,
  });
}).catch(function(err) {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
