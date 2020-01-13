'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe('test/install-with-env.test.js', () => {
  const cwd = helper.fixtures('install-husky-4');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install husky@4.0.3', async () => {
    await coffee.fork(helper.npminstall, [], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /INIT_CWD:.+install-husky-4/)
      .end();
  });
});
