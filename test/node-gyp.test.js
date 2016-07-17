'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

describe('test/node-gyp.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should node-gyp work fine', function* () {
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'node-icu-charset-detector', version: '0.1.4' },
        ],
      });
    } catch (err) {
      // ignore
    }
    assert(fs.existsSync(path.join(tmp, 'node_modules/node-icu-charset-detector/build')));
  });
});
