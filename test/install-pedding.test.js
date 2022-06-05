'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
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
  });
});
