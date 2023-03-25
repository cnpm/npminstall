const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/ignoreScripts.test.js', () => {
  const root = helper.fixtures('ignore-scripts');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should ignore scripts', async () => {
    await npminstall({
      root,
      ignoreScripts: true,
    });

    const dirs = await fs.readdir(path.join(root, 'node_modules'));
    assert.deepEqual(dirs.sort(), [ '.store', '.package_versions.json', '.tmp', 'pkg' ].sort());
    const files = await fs.readdir(path.join(root, 'node_modules/pkg'));
    assert.deepEqual(files, [ 'index.js', 'package.json' ]);
  });
});
