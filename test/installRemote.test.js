'use strict';

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

  it('should install with remote url', function* () {
    yield npminstall({
      root,
    });
    let pkg = yield readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert.equal(pkg.name, 'pedding');

    pkg = yield readJSON(path.join(root, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.deepEqual(dirs.sort(), [ '.tmp', 'pedding', 'taffydb', '.pedding@1.0.0', '.taffydb@2.7.2' ].sort());
  });

  it('should install https://registry.npm.taobao.org/taffydb/download/taffydb-2.7.2.tgz', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [{ name: null, version: 'https://registry.npm.taobao.org/taffydb/download/taffydb-2.7.2.tgz' }],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');
  });
});
