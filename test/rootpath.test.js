'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe('test/rootpath.test.js', () => {
  const cwd = helper.fixtures('rootpath');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should run preinstall and postinstall', () => {
    return coffee.fork(helper.npminstall, [ '-d' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /hello process\.env\.npm_rootpath is true/)
      .end();
  });
});
