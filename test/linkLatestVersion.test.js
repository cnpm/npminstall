'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/linkLatestVersion.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'link-latest-version');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install latest version to .npminstall/node_modules', function* () {
    yield npminstall({
      root,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', 'urllib', 'package.json'));
    assert.equal(pkg.version, '2.7.1');

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.deepEqual(dirs, [ '.npminstall', 'debug', 'urllib' ]);

    const pkg2 = yield readJSON(path.join(root,
      'node_modules', '.npminstall', 'node_modules', 'iconv-lite', 'package.json'));
    assert.equal(pkg2.name, 'iconv-lite');

    // debug also need link
    const exists = yield fs.exists(path.join(root, 'node_modules', '.npminstall', 'node_modules', 'debug'));
    assert(exists);
  });
});
