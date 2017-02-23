'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');
const mkdirp = require('../lib/utils').mkdirp;
const readJSON = require('../lib/utils').readJSON;

describe('test/semver_install.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function* () {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  // $ npm dist-tag ls npm-tag-test-package
  //
  // beta: 0.1.1
  // latest: 0.1.0
  // rc1: 1.1.1

  describe('use latest 0.1.0', () => {
    it('should install npm-tag-test-package@* => 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '*' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package => 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@0.x.x => 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '0.x.x' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@0.x => 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '0.x' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@0 => 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@^0.1.0 => 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '^0.1.0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@~0.1.0=> 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '~0.1.0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@0=> 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@>=0.1.0=> 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '>=0.1.0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@>=0.0.1=> 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '>=0.0.1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });

    it('should install npm-tag-test-package@latest=> 0.1.0', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: 'latest' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.0');
    });
  });

  describe('dont use latest', () => {
    it('should install npm-tag-test-package@^0.1.1 => 0.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '^0.1.1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.1');
    });

    it('should install npm-tag-test-package@~0.1.1 => 0.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '~0.1.1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.1');
    });

    it('should install npm-tag-test-package@^1.0.0 => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '^1.0.0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@1.x.x => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '1.x.x' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@1.x => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '1.x' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@1 => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@>=1 => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '>=1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@>=1.0.0 => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '>=1.0.0' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@>=0.1.1 => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: '>=0.1.1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@rc1 => 1.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: 'rc1' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '1.1.1');
    });

    it('should install npm-tag-test-package@beta => 0.1.1', function* () {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'npm-tag-test-package', version: 'beta' },
        ],
      });
      const pkg = yield readJSON(path.join(tmp, 'node_modules', 'npm-tag-test-package', 'package.json'));
      assert(pkg.version === '0.1.1');
    });
  });
});
