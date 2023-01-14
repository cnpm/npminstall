const path = require('path');
const coffee = require('coffee');
const assertFile = require('assert-file');
const helper = require('./helper');

describe('test/install-disable-fallback-store.test.js', () => {
  const cwd = helper.fixtures('install-disable-fallback-store');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);

  it('should install --disable-fallback-store', async () => {
    await coffee.fork(helper.npminstall, [ '--disable-fallback-store' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    assertFile(path.join(cwd, 'node_modules/urllib/package.json'));
    assertFile.fail(path.join(cwd, 'node_modules/.store/node_modules'));
    assertFile.fail(path.join(cwd, 'node_modules/.store/node_modules/undici'));
    assertFile.fail(path.join(cwd, 'node_modules/.store/node_modules/urllib'));
  });

  it('should install --disable-fallback-store=false', async () => {
    await coffee.fork(helper.npminstall, [], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    assertFile(path.join(cwd, 'node_modules/urllib/package.json'));
    assertFile(path.join(cwd, 'node_modules/.store/node_modules'));
    assertFile(path.join(cwd, 'node_modules/.store/node_modules/undici'));
    assertFile.fail(path.join(cwd, 'node_modules/.store/node_modules/urllib'));
  });
});
