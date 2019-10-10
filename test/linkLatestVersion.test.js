'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/linkLatestVersion.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'link-latest-version');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install latest version to node_modules', function* () {
    const names = [ 'debug', 'ms', 'iconv-lite', 'utility' ];
    yield npminstall({
      root,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', 'urllib', 'package.json'));
    assert.equal(pkg.version, '2.7.1');

    const versions = {};
    for (const name of names) {
      const pkg = yield readJSON(path.join(root, 'node_modules', name, 'package.json'));
      versions[pkg.name] = pkg.version;
    }

    const pkg2 = yield readJSON(path.join(root,
      'node_modules', 'iconv-lite', 'package.json'));
    assert.equal(pkg2.name, 'iconv-lite');

    yield npminstall({
      root,
      pkgs: [{ name: 'toshihiko', version: '1.0.0-alpha.10' }],
    });

    for (const name of names) {
      const pkg = yield readJSON(path.join(root, 'node_modules', name, 'package.json'));
      assert.strictEqual(pkg.version, versions[pkg.name]);
    }
  });

  it('should force link latest version to node_modules', function* () {
    const names = [ 'debug', 'ms', 'iconv-lite', 'utility' ];
    yield npminstall({
      root,
      forceLinkLatest: true,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', 'urllib', 'package.json'));
    assert.equal(pkg.version, '2.7.1');

    const versions = {};
    for (const name of names) {
      const pkg = yield readJSON(path.join(root, 'node_modules', name, 'package.json'));
      versions[pkg.name] = pkg.version;
    }

    const pkg2 = yield readJSON(path.join(root,
      'node_modules', 'iconv-lite', 'package.json'));
    assert.equal(pkg2.name, 'iconv-lite');

    yield npminstall({
      root,
      pkgs: [{ name: 'toshihiko', version: '1.0.0-alpha.10' }],
      forceLinkLatest: true,
    });

    for (const name of names) {
      const pkg = yield readJSON(path.join(root, 'node_modules', name, 'package.json'));
      switch (name) {
        case 'debug':
        case 'iconv-lite':
          assert.strictEqual(pkg.version, versions[pkg.name]);
          break;

        case 'ms':
        case 'utility':
        default:
          assert(pkg.version !== versions[pkg.name]);
          break;
      }
    }
  });
});
