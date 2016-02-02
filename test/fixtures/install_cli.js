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

// require('debug').enable('npminstall:*');
const co = require('co');
const npminstall = require('../../');

co(function*() {
  yield npminstall({
    root: process.cwd(),
    // registry, default is https://registry.npmjs.org
    registry: 'https://registry.npm.taobao.org',
  });
}).catch(function(err) {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
