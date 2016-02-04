/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const mkdirp = require('mkdirp');
const npminstall = require('../');

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

  it('should install node-pre-gyp@0.6.19', function*() {
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
    const dirs = yield fs.readdir(path.join(tmp, 'node_modules/.npminstall'));
    assert.deepEqual(dirs, [ 'node-pre-gyp' ]);
  });

  it('should link bundleDependencies bin', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [{
        name: 'fsevents',
        version: '1.0.6',
      }],
    });
    const bins = yield fs.readdir(path.join(tmp, 'node_modules/fsevents/node_modules/.bin'));
    assert.deepEqual(bins, ['node-pre-gyp']);
  });
});
