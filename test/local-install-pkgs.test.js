'use strict';

const assert = require('assert');
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/local-install-pkgs.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'local-install-pkgs');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install pkg and dont link latestVersions', function* () {
    yield coffee.fork(npminstall, [ 'koa' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .notExpect('stdout', /Linked \d+ latest versions/)
      .end();
    const names = fs.readdirSync(path.join(root, 'node_modules'))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length === 1);
    assert(names[0] === 'koa');
  });
});
