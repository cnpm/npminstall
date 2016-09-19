'use strict';

const assert = require('power-assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('fs');
const npminstall = require('./npminstall');

describe('test/install-pedding.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'install-pedding');

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should install pedding version on dependencies', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding' },
      ],
    });
    assert(JSON.parse(fs.readFileSync(path.join(tmp, 'node_modules/pedding/package.json'))).version === '0.0.1');
  });
});
