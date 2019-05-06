'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/bin.test.js', () => {
  const root = helper.fixtures('bin');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should create bins after install', async () => {
    await npminstall({
      root,
    });
    const pkg = await readJSON(path.join(root, 'node_modules', 'yo', 'package.json'));
    assert.equal(pkg.name, 'yo');
    assert.equal(pkg.version, '1.6.0');
    assert(fs.existsSync(path.join(root, 'node_modules', '.bin', 'yo')));
  });

  it('should create bin folders for scoped pkg', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: '@bigfunger/decompress-zip' },
      ],
    });
    const pkg = await readJSON(path.join(root, 'node_modules', '@bigfunger/decompress-zip', 'package.json'));
    assert(pkg.name === '@bigfunger/decompress-zip');
    assert(fs.existsSync(path.join(root, 'node_modules', '.bin', 'decompress-zip')));
  });
});
