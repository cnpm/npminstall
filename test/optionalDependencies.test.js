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
const readJSON = require('../lib/utils').readJSON;
const mkdirp = require('mkdirp');
const npminstall = require('../');

describe('test/optionalDependnecies.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');
  const root = path.join(__dirname, 'fixtures', 'optional');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(tmp);
  }

  beforeEach(function() {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should install optionalDependnecies', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-redis', version: 'latest' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/koa-redis/package.json'));
    assert(pkg.optionalDependencies.hiredis);

    const dirs = yield fs.readdir(path.join(tmp, 'node_modules/koa-redis/node_modules'));
    assert(dirs.indexOf('hiredis') >= 0);
  });

  it('should ignore optionalDependencies install error', function*() {
    yield npminstall({
      root: root,
    });

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.equal(dirs.indexOf('@dead_horse/not-exist'), -1);
  });
});
