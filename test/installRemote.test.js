'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

const registry = process.env.npm_china ? 'https://registry.npm.taobao.org' : 'https://registry.npmjs.org';

describe('test/installRemote.test.js', () => {
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
    assert.deepEqual(dirs.sort(), [ '.tmp', 'pedding', 'taffydb', '_pedding@1.0.0@pedding', '_taffydb@2.7.2@taffydb', '.package_versions.json' ].sort());
  });

  it('should install remote/taffydb/-/taffydb-2.7.2.tgz', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [{ name: null, version: `${registry}/taffydb/-/taffydb-2.7.2.tgz` }],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');
  });

  it('should install name not match error', function* () {
    try {
      yield npminstall({
        root: tmp,
        pkgs: [{ name: 'error', version: `${registry}/taffydb/-/taffydb-2.7.2.tgz` }],
      });
    } catch (err) {
      assert(/Invalid Package, expected error but found taffydb/.test(err.message), err.message);
    }
  });
});
