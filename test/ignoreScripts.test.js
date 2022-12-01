'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
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
    assert.deepEqual(dirs.sort(), [ '.pnpm', '.package_versions.json', '.tmp', 'pkg' ].sort());
    const files = await fs.readdir(path.join(root, 'node_modules/pkg'));
    assert.deepEqual(files, [ 'index.js', 'package.json' ]);
  });
});
