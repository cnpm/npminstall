const coffee = require('coffee');
const helper = require('./helper');

describe('test/license.test.js', () => {
  const cwd = helper.fixtures('forbidden-license');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install forbidden license error', async () => {
    await coffee.fork(helper.npminstall, [
      '--forbidden-licenses=mit,sic',
      './forbidden',
    ], { cwd })
      .expect('stderr', /package forbidden's license\(MIT-v3\.0\) is not allowed/)
      .end();
  });

  it('should install none / allowed license ok', async () => {
    await coffee.fork(helper.npminstall, [
      '--forbidden-licenses=mit,sic',
      './allow',
      './none',
      '-d',
    ], { cwd })
      .expect('stdout', /2 packages installed from local file/)
      .end();
  });
});
