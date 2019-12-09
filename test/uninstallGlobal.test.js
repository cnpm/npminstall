'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const mkdirp = require('../lib/utils').mkdirp;

describe('test/uninstallGlobal.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function* () {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  it('should uninstall with global and prefix', done => {
    coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'mocha',
    ])
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err);
        coffee.fork(require.resolve('../bin/uninstall'), [
          `--prefix=${tmp}`,
          '-g',
          'mocha',
        ])
          .debug()
          .expect('stdout', /- mocha@\d+\.\d+\.\d+/)
          .expect('code', 0)
          .end(done);
      });
  });
});
