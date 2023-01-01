const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const { rimraf, exists } = require('../lib/utils');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/install-ignore-optional.test.js', () => {
  let cwd;
  async function cleanup() {
    cwd && await rimraf(path.join(cwd, 'node_modules'));
    cwd = null;
  }

  before(cleanup);
  after(cleanup);

  it('should install ignore optionalDependencies', async () => {
    cwd = path.join(__dirname, 'fixtures', 'ignore-optional');
    await coffee.fork(npminstall, [ '--no-optional', '--production', '-d' ], { cwd })
      .debug()
      .notExpect('stderr', /node-gyp rebuild/)
      .expect('stdout', /pinyin@2.8.3 installed/)
      .expect('code', 0)
      .end();
    const e = await exists(path.join(cwd, 'node_modules/pinyin/node_modules/nodejieba'));
    assert(!e);
  });
});
