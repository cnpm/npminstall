'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe('test/registry-only.test.js', () => {
  const cwd = helper.fixtures('registry-only');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install fail', () => {
    return coffee.fork(helper.npminstall, [ '--registry-only' ], {
      cwd,
    })
      .debug()
      .expect('stderr', /Only allow install package from registry/)
      .expect('code', 1)
      .end();
  });
});
