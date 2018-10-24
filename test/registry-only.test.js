'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');

describe('test/registry-only.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'registry-only');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install ok', () => {
    return coffee.fork(npminstall, [ '--registry-only' ], {
      cwd: root,
    })
    .debug()
    .expect('stderr', /Only allow install package from registry/)
    .expect('code', 1)
    .end();
  });
});
