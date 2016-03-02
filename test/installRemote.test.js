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
const mkdirp = require('mkdirp');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/installRemote.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'github');
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  beforeEach(() => {
    rimraf.sync(path.join(root, 'node_modules'));
    mkdirp.sync(tmp);
  });
  afterEach(() => {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(tmp);
  });

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

  it('should install http://r.cnpmjs.org/taffydb/download/taffydb-2.7.2.tgz', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [{name: null, version: 'http://r.cnpmjs.org/taffydb/download/taffydb-2.7.2.tgz'}],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');
  });
});
