const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/bigPackage.test.js', () => {
  function testcase(name) {
    describe(name, () => {
      const root = helper.fixtures(name);
      const cleanup = helper.cleanup(root);

      beforeEach(cleanup);
      afterEach(cleanup);

      it('should install success', async () => {
        if (process.platform === 'win32') return;
        await npminstall({
          root,
          trace: true,
        });
      });
    });
  }

  [
    'standardtest',
  ].forEach(testcase);
});
