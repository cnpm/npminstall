'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const npminstall = require('./npminstall');

describe('test/production.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'production');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should ignore devDependencies when install with production', function* () {
    yield npminstall({
      root,
      production: true,
    });

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.equal(dirs.indexOf('mocha'), -1);
    assert(dirs.indexOf('should') >= 0);
    assert(dirs.indexOf('koa') >= 0);
  });
});
