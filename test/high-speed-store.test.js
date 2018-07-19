'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('test/high-speed-store.test.js', () => {
  const cwd = path.join(__dirname, 'fixtures', 'high-speed-store');
  const storeScript = path.join(cwd, 'store.js');
  const bin = path.join(__dirname, '../bin/install.js');

  function cleanup() {
    rimraf.sync(path.join(cwd, 'node_modules'));
    rimraf.sync(path.join(cwd, 'tmp'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should get tarball stream from store', function* () {
    yield coffee.fork(bin, [ '-d', `--high-speed-store=${storeScript}` ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    const pkg = require(path.join(cwd, 'node_modules/@types/react-dom/node_modules/@types/react/package.json'));
    assert(pkg.version === '15.0.4');
    assert(fs.readdirSync(path.join(cwd, 'tmp')).length === 2);
  });
});
