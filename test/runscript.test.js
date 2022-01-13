'use strict';

const assert = require('assert');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/runscript.test.js', () => {
  const root = helper.fixtures('runscript');
  // const cleanup = helper.cleanup(root);

  // beforeEach(cleanup);
  // afterEach(cleanup);

  it('should run preinstall and postinstall', async () => {
    // ignore windows
    if (process.platform === 'win32') return;
    await npminstall({
      root,
      registry: 'https://registry.npmjs.com',
      env: {
        NODE_OPTIONS: '--max_old_space_size=4096',
      },
    });
    const pkg = await readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert(pkg.name === 'pedding');
  });
});
