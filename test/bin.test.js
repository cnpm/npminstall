'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/bin.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'bin');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should create bins after install', function* () {
    yield npminstall({
      root,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', 'yo', 'package.json'));
    assert.equal(pkg.name, 'yo');
    assert.equal(pkg.version, '1.6.0');
    assert(fs.existsSync(path.join(root, 'node_modules', '.bin', 'yo')));
  });

  it('should create bin folders for scoped pkg', function* () {
    yield npminstall({
      root,
      pkgs: [
        { name: '@bigfunger/decompress-zip' },
      ],
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', '@bigfunger/decompress-zip', 'package.json'));
    assert.equal(pkg.name, '@bigfunger/decompress-zip');
    assert(fs.existsSync(path.join(root, 'node_modules', '.bin/@bigfunger', 'decompress-zip')));
  });
});
