'use strict';

const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/peerDependencies.test.js', () => {
  const root = helper.fixtures('peerDependencies');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should show peerDependencies warning message', async () => {
    await npminstall({
      root,
    });
  });
});
