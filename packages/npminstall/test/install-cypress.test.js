'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe.skip('test/install-cypress.test.js', () => {
  const cwd = helper.fixtures('install-cypress');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install cypress version on dependencies', async () => {
    await coffee.fork(helper.npminstall, [ '-c' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
  });
});
