'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');
const mkdirp = require('../lib/utils').mkdirp;
const readJSON = require('../lib/utils').readJSON;

describe('test/index.test.js', function() {

  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function* () {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  it('should npminstall with options.pkgs', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: '@rstacruz/tap-spec', version: '~4.1.1' },
        { name: 'mocha' },
        { name: 'pedding', version: 1 },
        { name: 'contributors' },
      ],
    });
  });

  it('should npminstall not exists package throw error', function* () {
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'mocha1111' },
        ],
      });
      throw new Error('should not run this');
    } catch (err) {
      assert(/response 404 status/.test(err.message));
    }
  });

  it('should npminstall demo project', function* () {
    const demodir = path.join(__dirname, 'fixtures', 'demo');
    rimraf.sync(path.join(demodir, 'node_modules'));

    yield npminstall({
      root: demodir,
    });
    const pkgfile = path.join(demodir, 'node_modules', 'koa', 'package.json');
    let pkg = JSON.parse(fs.readFileSync(pkgfile));
    assert.equal(pkg.name, 'koa');

    // install again should be faster
    yield npminstall({
      root: demodir,
    });
    pkg = JSON.parse(fs.readFileSync(pkgfile));
    assert.equal(pkg.name, 'koa');
  });

  it('should relink exists link file work', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding', version: '0' },
      ],
    });
    const v0 = yield readJSON(path.join(tmp, 'node_modules', 'pedding', 'package.json'));
    assert.equal(v0.version[0], '0');

    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding', version: '1' },
      ],
    });
    const v1 = yield readJSON(path.join(tmp, 'node_modules', 'pedding', 'package.json'));
    assert.equal(v1.version[0], '1');
  });

  it('should request registry when not install from package.json', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-onerror', version: '1.2.0' },
      ],
    });

    const v1 = yield readJSON(path.join(tmp, 'node_modules', 'koa-onerror', 'package.json'));
    assert.equal(v1.version, '1.2.0');

    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-onerror', version: '1' },
      ],
    });

    const v2 = yield readJSON(path.join(tmp, 'node_modules', 'koa-onerror', 'package.json'));
    assert.equal(v2.version, '1.3.1');
  });

  it('should install chromedriver work', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'chromedriver' },
      ],
    });
  });

  describe('_from, _resolved in package.json', function() {
    const root = path.join(__dirname, 'fixtures', 'packageMeta');

    function cleanup() {
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should add _from, _resolved to package.json', function* () {
      yield npminstall({
        root,
      });
      // node_modules/.debug@2.2.0 should exists
      assert(yield fs.exists(path.join(root, 'node_modules', '.debug@2.2.0')));

      const debugPkg = yield readJSON(path.join(root, 'node_modules', 'debug', 'package.json'));
      assert.equal(debugPkg._from, 'debug@2.2.0');
      assert(debugPkg._resolved);

      const peddingPkg = yield readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
      assert.equal(peddingPkg._from, 'pedding@http://registry.npmjs.org/pedding/-/pedding-1.0.0.tgz');
      assert.equal(peddingPkg._resolved, 'http://registry.npmjs.org/pedding/-/pedding-1.0.0.tgz');

      const bytesPkg = yield readJSON(path.join(root, 'node_modules', 'bytes', 'package.json'));
      assert.equal(bytesPkg._from, 'bytes@https://github.com/visionmedia/bytes.js.git');
      assert(/^https:\/\/github\.com\/visionmedia\/bytes\.js\.git#\w+$/.test(bytesPkg._resolved), bytesPkg._resolved);
    });
  });
});
