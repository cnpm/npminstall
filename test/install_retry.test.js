const coffee = require('coffee');
const helper = require('./helper');

describe('test/install_retry.test.js', () => {
  describe('retry', () => {
    const root = helper.fixtures('options-retry');
    const cleanup = helper.cleanup(root);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should use 5 retry failed', async () => {
      await coffee.fork(helper.npminstall, [ '--retry', '5' ], { cwd: root })
        .debug()
        .notExpect('code', 0)
        .end();
    });
  });
});
