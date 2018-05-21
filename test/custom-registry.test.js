'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('fs');
const coffee = require('coffee');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/custom-registry.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'install-pedding');

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should install with custom registry', function* () {
    const args = [
      '--registry=https://r.cnpmjs.org?bucket=foo',
      '-d',
    ];
    yield coffee.fork(npminstall, args, { cwd: tmp })
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();
    assert(JSON.parse(fs.readFileSync(path.join(tmp, 'node_modules/pedding/package.json'))).version === '0.0.1');
  });
});
