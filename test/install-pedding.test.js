const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/install-pedding.test.js', () => {
  const root = helper.fixtures('install-pedding');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install pedding version on dependencies', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: 'pedding' },
      ],
    });
    assert(JSON.parse(await fs.readFile(path.join(root, 'node_modules/pedding/package.json'))).version === '0.0.1');
    assert(JSON.parse(await fs.readFile(path.join(root, 'node_modules/.store/pedding@0.0.1/node_modules/pedding/package.json'))).version === '0.0.1');
  });
});
