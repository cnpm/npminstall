'use strict';

const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');

describe('test/peerDependencies.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'peerDependencies');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should show peerDependencies warning message', function* () {
    yield npminstall({
      root,
    });
  });
});
