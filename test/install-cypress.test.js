'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe.skip('test/install-cypress.test.js', () => {
  const cwd = path.join(__dirname, 'fixtures', 'install-cypress');

  function cleanup() {
    rimraf.sync(path.join(cwd, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
  });
  // afterEach(cleanup);

  it('should install cypress version on dependencies', function* () {
    return coffee.fork(npminstall, [ '-c' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
  });
});
