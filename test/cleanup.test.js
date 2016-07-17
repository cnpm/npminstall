'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

describe('test/cleanup.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should remove donefile when install failed', function* () {
    let throwError = false;
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: 'latest' },
        ],
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);

    let exists = yield fs.exists(path.join(tmp, 'node_modules/.npminstall/install-error/1.0.1/install-error/.npminstall.done'));
    assert.equal(exists, false);
    const dirs = yield fs.readdir(path.join(tmp, 'node_modules'));
    assert.deepEqual(dirs, [ '.npminstall' ]);

    // install again will try to download
    throwError = false;
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: 'latest' },
        ],
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);
    exists = yield fs.exists(path.join(tmp, 'node_modules/.npminstall/install-error/1.0.1/install-error/.npminstall.done'));
    assert.equal(exists, false);
  });

  it('should remove donefile when excute postinstall script failed', function* () {
    let throwError = false;
    const pkgs = [{ version: '../postinstall-error', type: 'local' }];
    try {
      yield npminstall({
        root: tmp,
        pkgs,
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);

    let exists = yield fs.exists(path.join(tmp, 'node_modules/.npminstall/postinstall-error/1.0.0/postinstall-error/.npminstall.done'));
    assert.equal(exists, false);

    // install again will try to download
    throwError = false;
    try {
      yield npminstall({
        root: tmp,
        pkgs,
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);
    exists = yield fs.exists(path.join(tmp, 'node_modules/.npminstall/postinstall-error/1.0.0/postinstall-error/.npminstall.done'));
    assert.equal(exists, false);
  });
});
