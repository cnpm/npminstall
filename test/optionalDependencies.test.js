'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/optionalDependencies.test.js', () => {
  const root = helper.fixtures('optional');
  const cleanupModules = helper.cleanup(root);
  const [ tmp, cleanupTmp ] = helper.tmp();

  async function cleanup() {
    await Promise.all([
      cleanupModules(),
      cleanupTmp(),
    ]);
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install optionalDependencies', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-redis', version: '3.1.0' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/koa-redis/package.json'));
    assert(pkg.optionalDependencies.hiredis);

    const dirs = await fs.readdir(path.join(tmp, 'node_modules/koa-redis/node_modules'));
    // assert(dirs.includes('hiredis'));
    assert(dirs.includes('redis'));
  });

  it('should ignore optionalDependencies install error', async () => {
    await npminstall({
      root,
    });

    const dirs = await fs.readdir(path.join(root, 'node_modules'));
    assert.equal(dirs.indexOf('@dead_horse/not-exist'), -1);

    // less should exists
    const pkg = await helper.readJSON(path.join(root, 'node_modules/less/package.json'));
    assert(pkg.optionalDependencies.mkdirp);
    const pkg2 = await helper.readJSON(path.join(root, 'node_modules/less/node_modules/mkdirp/package.json'));
    assert.equal(pkg2.name, 'mkdirp');
  });
});
