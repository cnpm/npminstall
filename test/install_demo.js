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

const path = require('path');
const co = require('co');
const npminstall = require('../');

co(function*() {
  yield npminstall({
    // install root dir
    root: path.join(__dirname, 'fixtures', 'demo'),
    // optional packages need to install, default is package.json's dependencies and devDependencies
    // pkgs: [
    //   { name: 'mocha' },
    //   { name: 'mocha' },
    //   { name: 'express' },
    // ],
    // registry, default is https://registry.npmjs.org
    registry: 'https://registry.npm.taobao.org',
    debug: true,
    // storeDir: root + '.npminstall',
  });
}).catch(function(err) {
  console.error(err.stack);
});
