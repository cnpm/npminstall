const coffee = require('coffee');
const helper = require('./helper');

describe('test/install-public-hoist-pattern.test.js', () => {
  const cwd = helper.fixtures('public-hoist-pattern');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  // afterEach(cleanup);

  it('should set public-hoist-pattern to [\'*eslint*\', \'*prettier*\'] by default', async () => {
    await coffee.fork(helper.npminstall, [], {
      cwd,
      env: Object.assign({}, process.env, {
        USERPROFILE: cwd,
        HOME: cwd,
      }),
    })
      .debug()
      .expect('code', 0)
      .end();
  });
});
