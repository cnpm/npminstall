'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/install-enable-prune.test.js', () => {
  const cwd = path.join(__dirname, 'fixtures', 'install-enable-prune');

  function cleanup() {
    rimraf.sync(path.join(cwd, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
  });
  afterEach(cleanup);

  it('should install --prune', function* () {
    yield coffee.fork(npminstall, [ '--prune', '--production' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    assert(!fs.existsSync(path.join(cwd, 'node_modules/egg/README.md')));
  });
});
