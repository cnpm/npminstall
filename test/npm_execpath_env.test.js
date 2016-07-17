'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

describe('test/npm_execpath_env.test.js', () => {
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
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'dtrace-provider' },
      ],
    });
    assert(fs.existsSync(path.join(tmp, 'node_modules/dtrace-provider')));
  });
});
