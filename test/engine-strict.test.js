const coffee = require('coffee');
const helper = require('./helper');

describe('test/engine-strict.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should show engine strict warn message', () => {
    return coffee.fork(helper.npminstall, [
      'express@1',
    ], {
      cwd: tmp,
    })
    // .debug()
      .expect('stderr', /WARN node unsupported/)
      .expect('stderr', /All packages installed/)
      .expect('code', 0)
      .end();
  });

  it('should install fail when --engine-strict enable', () => {
    return coffee.fork(helper.npminstall, [
      'express@1',
      '--engine-strict',
    ], {
      cwd: tmp,
    })
    // .debug()
      .expect('stderr', /Install fail! UnSupportedNodeError/)
      .expect('code', 1)
      .end();
  });
});
