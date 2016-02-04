/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const mkdirp = require('mkdirp');
const npminstall = require('../');

describe('test/cleanup.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function() {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should cleanup when install failed', function*() {
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: 'latest' },
        ],
      });
    } catch (_) {
      // ignore
    }

    let dirs = yield fs.readdir(path.join(tmp, 'node_modules/.npminstall/install-error'));
    assert.deepEqual(dirs, []);
    dirs = yield fs.readdir(path.join(tmp, 'node_modules/.npminstall/postinstall-error'));
    assert.deepEqual(dirs, []);
    dirs = yield fs.readdir(path.join(tmp, 'node_modules'));
    assert.deepEqual(dirs, ['.npminstall']);
  });
});
