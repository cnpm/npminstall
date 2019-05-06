'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/package-versions.test.js', () => {
  const root = helper.fixtures('package-versions');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should not record package version when not installRoot', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: 'koa', version: 'latest' },
      ],
    });
    assert(!fs.existsSync(path.join(root, 'node_modules/.package_versions.json')));
    assert(fs.existsSync(path.join(root, 'node_modules/koa')));
  });

  it('should record package version when installRoot', async () => {
    await npminstall({
      root,
      pkgs: [],
    });
    const packageVersions = await helper.readJSON(path.join(root, 'node_modules/.package_versions.json'));
    assert(packageVersions.egg.length === 1);
    const eggPackage = await helper.readJSON(path.join(root, 'node_modules/egg/package.json'));
    assert(eggPackage.version === packageVersions.egg[0]);
  });
});
