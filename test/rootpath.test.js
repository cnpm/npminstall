'use strict';

const rimraf = require('rimraf');
const path = require('path');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/rootpath.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'rootpath');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should run preinstall and postinstall', () => {
    return coffee.fork(npminstall, [ '-d' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stdout', /hello process\.env\.npm_rootpath is true/)
      .end();
  });
});
