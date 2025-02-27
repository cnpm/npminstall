const coffee = require('coffee');
const helper = require('./helper');

describe('test/install_concurrency.test.js', () => {
  describe('concurrency', () => {
    const root = helper.fixtures('options-concurrency');
    const cleanup = helper.cleanup(root);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should use 5 concurrency success', async () => {
      await coffee.fork(helper.npminstall, [ '--concurrency', '5' ], { cwd: root })
        .debug()
        .expect('code', 0)
        .end();
    });
  });
});
