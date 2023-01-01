const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
const coffee = require('coffee');
const helper = require('./helper');

describe('test/custom-registry.test.js', () => {
  const tmp = helper.fixtures('install-pedding');
  const cleanup = helper.cleanup(tmp);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install with custom registry', async () => {
    const args = [
      '--registry=https://registry.npmmirror.com?bucket=foo',
      '--registry=https://registry.npmmirror.com?bucket=bar',
      '-d',
    ];
    await coffee.fork(helper.npminstall, args, { cwd: tmp })
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();
    assert(JSON.parse(await fs.readFile(path.join(tmp, 'node_modules/pedding/package.json'))).version === '0.0.1');
  });
});
