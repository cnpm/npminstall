/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('../');

describe('test/installRemote.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'github');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(path.join(root, '.npminstall'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install with remote url', function*() {
    yield npminstall({
      root: root,
    });
    let pkg = yield readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert.equal(pkg.name, 'pedding');

    pkg = yield readJSON(path.join(root, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');

    const dirs = yield fs.readdir(path.join(root, 'node_modules/.npminstall'));
    assert.deepEqual(dirs.sort(), [ '.tmp', 'pedding', 'taffydb' ].sort());
  });
});
