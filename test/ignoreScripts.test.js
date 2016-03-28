/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
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
const npminstall = require('./npminstall');

describe('test/ignoreScripts.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'ignore-scripts');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should ignore scripts', function*() {
    yield npminstall({
      root: root,
      ignoreScripts: true,
    });

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.deepEqual(dirs, [ '.npminstall', 'pkg' ]);
    const files = yield fs.readdir(path.join(root, 'node_modules/pkg'));
    assert.deepEqual(files, [ '.npminstall.done', 'index.js', 'package.json' ]);
  });
});
