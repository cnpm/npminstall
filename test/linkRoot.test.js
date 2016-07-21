'use strict';

const npminstall = require('./npminstall');
const rimraf = require('rimraf');
const assert = require('assert');
const path = require('path');
const mkdirp = require('mkdirp');

describe('test/linkRoot.test.js', function() {
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
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'es3ify', version: '0.1.2' },
        { name: 'es3ify-loader', version: '0.1.0' },
      ],
    });
    let pkg = require(path.join(tmp, 'node_modules/es3ify/package.json'));
    assert.equal(pkg.version, '0.1.2');
    pkg = require(path.join(tmp, 'node_modules/es3ify-loader/package.json'));
    assert.equal(pkg.version, '0.1.0');
  });
});
