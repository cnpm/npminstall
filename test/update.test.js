'use strict';

const assert = require('power-assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');
const npmupdate = path.join(__dirname, '../bin/update.js');
const fs = require('mz/fs');

describe('test/update.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'uninstall');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(() => {
    return coffee.fork(npminstall, [], {
      cwd: root,
      stdio: 'pipe',
    });
  });

  afterEach(cleanup);

  it('should uninstall ok', done => {
    coffee.fork(npmupdate, {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/koa'))));
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/pkg'))));
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/.1.0.0@pkg'))));
      done();
    });
  });
});
