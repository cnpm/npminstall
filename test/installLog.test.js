const coffee = require('coffee');
const helper = require('./helper');

if (process.platform !== 'win32') {
  describe('test/installLog.test.js', () => {
    const [ tmp, cleanup ] = helper.tmp();

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install pedding with detail log', () => {
      return coffee.fork(helper.npminstall, [
        'pedding',
        '-d',
      ], {
        cwd: tmp,
      })
        .expect('stdout', /pedding@latest installed/)
        .expect('code', 0)
        .end();
    });

    it('should install pedding without detail log', () => {
      return coffee.fork(helper.npminstall, [
        'pedding',
      ], {
        cwd: tmp,
      })
        .notExpect('stdout', /pedding@latest installed/)
        .expect('code', 0)
        .end();
    });
  });
}
