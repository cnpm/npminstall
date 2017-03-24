'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/package-versions.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'package-versions');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(function() {
    cleanup();
  });
  afterEach(cleanup);

  it('should not record package version when not installRoot', function* () {
    yield npminstall({
      root,
      pkgs: [
        { name: 'koa', version: 'latest' },
      ],
    });
    assert(!fs.existsSync(path.join(root, 'node_modules/.package_versions.json')));
    assert(fs.existsSync(path.join(root, 'node_modules/koa')));
  });

  it('should record package version when installRoot', function* () {
    yield npminstall({
      root,
      pkgs: [],
    });
    const packageVersions = yield readJSON(path.join(root, 'node_modules/.package_versions.json'));
    assert(packageVersions.egg.length === 1);
    const eggPackage = yield readJSON(path.join(root, 'node_modules/egg/package.json'));
    assert(eggPackage.version === packageVersions.egg[0]);
  });
});
