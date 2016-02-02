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

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('../');

describe.only('test/github.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'github');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(path.join(root, '.npminstall'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install ignore github repo', function*() {
    yield npminstall({
      root: root,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert.equal(pkg.name, 'pedding');

    // only urllib dir exists
    const dirs = yield fs.readdir(path.join(root, '.npminstall'));
    assert.deepEqual(dirs, [ 'pedding' ]);
  });
});
