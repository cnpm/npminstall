'use strict';

const assert = require('power-assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const coffee = require('coffee');
const npminstall = require('./npminstall');
const bin = path.join(__dirname, '../bin/install.js');

describe('test/production.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'production');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should ignore devDependencies when install with production', function* () {
    yield npminstall({
      root,
      production: true,
    });

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.equal(dirs.indexOf('mocha'), -1);
    assert(dirs.indexOf('should') >= 0);
    assert(dirs.indexOf('koa') >= 0);
  });

  it('should show detail and check node_modules dir on production mode', function* () {
    yield coffee.fork(bin, [ '--production' ], { cwd: root })
      .expect('code', 0)
      .expect('stdout', /installed at node_modules/)
      .end();
    // again
    yield coffee.fork(bin, [ '--production' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stdout', /koa@\* existed at/)
      .expect('stderr', /npminstall WARN node_modules exists: .+?node_modules/)
      .end();
  });
});
