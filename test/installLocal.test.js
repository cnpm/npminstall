'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/installLocal.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'local');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install local folder ok', function* () {
    yield npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg' },
      ],
    });
    const pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local folder with relative path ok', function* () {
    yield npminstall({
      root,
      pkgs: [
        { name: null, version: './pkg' },
      ],
    });
    const pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local link folder ok', function* () {
    if (process.platform === 'win32') {
      return;
    }
    yield npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg-link' },
      ],
    });
    const pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local gzip tarball ok', function* () {
    yield npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:sequelize.tgz' },
      ],
    });

    const pkg = yield readJSON(path.join(root, 'node_modules/sequelize/package.json'));
    assert.equal(pkg.name, 'sequelize');
  });

  it('should install local link gzip tarball ok', function* () {
    if (process.platform === 'win32') {
      return;
    }
    yield npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:sequelize-link.tgz' },
      ],
    });

    const pkg = yield readJSON(path.join(root, 'node_modules/sequelize/package.json'));
    assert.equal(pkg.name, 'sequelize');
  });

  it('should install local naked tarball ok', function* () {
    yield npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg.tar' },
      ],
    });
    const pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local folder without package.json error', function* () {
    try {
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:not-pkg' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json missed/), err.message);
    }
  });

  it('should install local tarball without package.json error', function* () {
    try {
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:not-pkg.tar' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json missed/), err.message);
    }
  });

  it('should install local folder without package name error', function* () {
    try {
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg-without-name' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json must contains name/), err.message);
    }
  });

  it('should install local tarball without package name error', function* () {
    try {
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg-without-name.tgz' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json must contains name/), err.message);
    }
  });

  if (process.platform !== 'win32') {
    it('should install the same tarball ok', function* () {
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg.tar' },
        ],
      });
      let pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg.tar' },
          // { name: null, version: 'file:pkg.tar' },
        ],
      });
      pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
    });

    it('should install the same local folder ok', function* () {
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg' },
        ],
      });
      let pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
      yield npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg' },
          { name: null, version: 'file:pkg' },
        ],
      });
      pkg = yield readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
    });
  }
});
