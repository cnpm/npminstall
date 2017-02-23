'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/forceSymlink.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should remove exist module first', function* () {
    mkdirp.sync(path.join(tmp, 'node_modules/debug'));
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'debug', version: '1.0.0' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/debug/package.json'));
    assert.equal(pkg.name, 'debug');
    assert.equal(pkg.version, '1.0.0');
  });
});
