'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');
const npmupdate = path.join(__dirname, '../bin/update.js');

describe('test/update.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'update');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(done => {
    cleanup();
    coffee.fork(npminstall, [], {
      cwd: root,
      stdio: 'pipe',
    })
      .debug()
      .end(done);
  });

  afterEach(cleanup);

  it('should update ok', done => {
    coffee.fork(npmupdate, [], {
      cwd: root,
      stdio: 'pipe',
    })
      .debug()
      .end(err => {
        assert(!err);
        assert(fs.existsSync(path.join(root, 'node_modules/pedding')));
        assert(fs.existsSync(path.join(root, 'node_modules/pkg')));
        done();
      });
  });

  it('should update pedding ok', done => {
    coffee.fork(npmupdate, [ 'pedding' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .debug()
      .end(err => {
        assert(!err);
        assert(fs.existsSync(path.join(root, 'node_modules/pedding')));
        assert(fs.existsSync(path.join(root, 'node_modules/pkg')));
        done();
      });
  });
});
