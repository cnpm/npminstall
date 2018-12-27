'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/ignore-install-optional-deps-fails.test.js', () => {
  const cwd = path.join(__dirname, 'fixtures', 'sub-module-optional-dep-install-fails');

  function cleanup() {
    rimraf.sync(path.join(cwd, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
  });
  afterEach(cleanup);

  it('should install success when optionalDependencies fails', function* () {
    return coffee.fork(npminstall, [ '-d' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
  });
});
