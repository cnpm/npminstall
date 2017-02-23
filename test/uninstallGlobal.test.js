'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const mkdirp = require('../lib/utils').mkdirp;

describe('test/uninstallGlobal.test.js', function() {
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
    .expect(/All packages installed/)
    .expect('code', 0)
    .end(err => {
      assert(!err);
      coffee.fork(require.resolve('../bin/uninstall'), [
        `--prefix=${tmp}`,
        '-g',
        'mocha',
      ])
      .debug()
      .expect(/- mocha@\d+\.\d+\.\d+ \.\/test\/fixtures\/tmp\/lib\/node_modules\/mocha/)
      .expect(/- mocha@\d+\.\d+\.\d+ \.\/test\/fixtures\/tmp\/bin\/mocha/)
      .expect(/- mocha@\d+\.\d+\.\d+ \.\/test\/fixtures\/tmp\/bin\/_mocha/)
      .expect('code', 0)
      .end(done);
    });
  });
});
