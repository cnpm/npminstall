const coffee = require('coffee');
const helper = require('./helper');

if (process.platform !== 'win32') {
  describe('test/install-with-python3.test.js', () => {
    const cwd = helper.fixtures('install-raw-socket');
    const cleanup = helper.cleanup(cwd);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install raw-socket with python3', async () => {
      // https://github.com/cnpm/npminstall/issues/384
      await coffee.fork(helper.npminstall, [ '-d' ], { cwd })
        .debug()
        .expect('code', 0)
        .end();
    });
  });
}
