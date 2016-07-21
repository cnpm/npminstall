'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

describe('test/bundleDependencies.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function() {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should install node-pre-gyp@0.6.19', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'node-pre-gyp', version: '0.6.19' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules', 'node-pre-gyp', 'package.json'));
    assert.equal(pkg.name, 'node-pre-gyp');
    assert.equal(pkg.version, '0.6.19');

    // only node-pre-gyp dir exists
    const dirs = yield fs.readdir(path.join(tmp, 'node_modules/'));
    assert.deepEqual(dirs.sort(), [ '.bin', '.node-pre-gyp@0.6.19', 'node-pre-gyp' ].sort());
  });

  it('should install bundleDependencies not exist(nyc@6.4.2)', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'nyc', version: '6.4.2' },
      ],
    });
    const exists = fs.existsSync(path.join(tmp, 'node_modules/nyc/node_modules/foreground-child'));
    assert(exists);
  });

  it('should link bundleDependencies bin', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [{
        name: 'sqlite3',
        version: '3.1.3',
      }],
    });
    const bins = yield fs.readdir(path.join(tmp, 'node_modules/sqlite3/node_modules/.bin'));
    if (process.platform === 'win32') {
      assert.deepEqual(bins, [ 'node-pre-gyp', 'node-pre-gyp.cmd' ]);
    } else {
      assert.deepEqual(bins, [ 'node-pre-gyp' ]);
    }
  });
});
