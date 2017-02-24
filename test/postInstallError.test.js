'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

describe('test/postInstallError.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should display error when post install', function* () {
    let throwError = false;
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: '1.0.0' },
        ],
      });
    } catch (err) {
      assert(err.message.indexOf('post install error, please remove node_modules before retry!') >= 0);
      throwError = true;
    }
    assert.equal(throwError, true);
  });
});
