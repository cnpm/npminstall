const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
const coffee = require('coffee');
const { rimraf } = require('../lib/utils');
const helper = require('./helper');

describe('test/install-workpsaces.test.js', () => {
  const root = helper.fixtures('npm-workspaces');
  const cleanup = helper.cleanup(root);

  beforeEach(async () => {
    await cleanup();
    await rimraf(path.join(root, 'packages/a/node_modules'));
    await rimraf(path.join(root, 'packages/b/node_modules'));
    await rimraf(path.join(root, 'packages/c'));
  });

  it('should install all on root', async () => {
    await coffee.fork(helper.npminstall, [], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();

    let pkg = await helper.readJSON(path.join(root, 'node_modules/aa/package.json'));
    assert.equal(pkg.name, 'aa');
    pkg = await helper.readJSON(path.join(root, 'node_modules/aa/node_modules/abbrev/package.json'));
    assert(pkg.name, 'abbrev');
    assert(pkg.version, '2.0.0');
    pkg = await helper.readJSON(path.join(root, 'packages/a/node_modules/abbrev/package.json'));
    assert(pkg.name, 'abbrev');
    assert(pkg.version, '2.0.0');
    pkg = await helper.readJSON(path.join(root, 'node_modules/b/package.json'));
    assert(pkg);
    assert.equal(pkg.name, 'b');
    pkg = await helper.readJSON(path.join(root, 'node_modules/b/node_modules/abbrev/package.json'));
    assert(pkg.name, 'abbrev');
    assert(pkg.version, '1.1.1');
    pkg = await helper.readJSON(path.join(root, 'packages/b/node_modules/abbrev/package.json'));
    assert(pkg.name, 'abbrev');
    assert(pkg.version, '1.1.1');
    pkg = await helper.readJSON(path.join(root, 'node_modules/abbrev-range/package.json'));
    assert(pkg.name, 'abbrev-range');
  });

  it('should install new package on one workspace', async () => {
    const pkgDir = path.join(root, 'packages/c');
    await fs.mkdir(pkgDir, { recursive: true });
    const pkgFile = path.join(pkgDir, 'package.json');
    await fs.writeFile(pkgFile, JSON.stringify({
      name: 'c',
    }));
    // npm install abbrev -w c
    await coffee.fork(helper.npminstall, [ 'abbrev', '-w', 'c' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    let pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(typeof pkg.dependencies.abbrev, 'string');

    await coffee.fork(helper.npminstall, [ 'abbrev@1.1.1', '-w', 'c' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(pkg.dependencies.abbrev, '^1.1.1');
    await rimraf(path.join(root, 'packages/c'));
  });

  it('should throw error when workspace not exists', async () => {
    await coffee.fork(helper.npminstall, [ 'abbrev', '--workspace', 'not-exists' ], { cwd: root })
      .debug()
      .expect('code', 1)
      .expect('stderr', /No workspaces found: --workspace=not-exists/)
      .end();
  });
});
