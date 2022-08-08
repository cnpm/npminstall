'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
const npminstall = require('./npminstall');
const helper = require('./helper');
const { rimraf, mkdirp } = require('../lib/utils');

const registry = process.env.npm_china ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.com';

describe('test/installRemote.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'github');
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  beforeEach(async () => {
    await rimraf(path.join(root, 'node_modules'));
    await mkdirp(tmp);
  });
  afterEach(async () => {
    await rimraf(path.join(root, 'node_modules'));
    await rimraf(tmp);
  });

  it('should install with remote url', async () => {
    await npminstall({
      root,
    });
    let pkg = await helper.readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert.equal(pkg.name, 'pedding');

    pkg = await helper.readJSON(path.join(root, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');

    const dirs = await fs.readdir(path.join(root, 'node_modules'));
    assert.deepEqual(dirs.sort(), [ '.tmp', 'pedding', 'taffydb', '_pedding@1.0.0@pedding', '_taffydb@2.7.2@taffydb', '.package_versions.json' ].sort());
  });

  it('should install remote/taffydb/-/taffydb-2.7.2.tgz', async () => {
    await npminstall({
      root: tmp,
      pkgs: [{ name: null, version: `${registry}/taffydb/-/taffydb-2.7.2.tgz` }],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules', 'taffydb', 'package.json'));
    assert.equal(pkg.name, 'taffydb');
  });

  it('should install name not match error', async () => {
    try {
      await npminstall({
        root: tmp,
        pkgs: [{ name: 'error', version: `${registry}/taffydb/-/taffydb-2.7.2.tgz` }],
      });
    } catch (err) {
      assert(/Invalid Package, expected error but found taffydb/.test(err.message), err.message);
    }
  });
});
