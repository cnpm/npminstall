'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe('test/ignore-install-optional-deps-fails.test.js', () => {
  const cwd = helper.fixtures('sub-module-optional-dep-install-fails');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install success when optionalDependencies fails', async () => {
    await coffee.fork(helper.npminstall, [ '-d' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
  });
});
