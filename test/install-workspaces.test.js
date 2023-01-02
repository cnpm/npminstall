const assert = require('assert');
const path = require('path');
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
  });

  it('should install with workspaces', async () => {
    await coffee.fork(helper.npminstall, [ '-c', '--save-dependencies-tree' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();

    let pkg = await helper.readJSON(path.join(root, 'node_modules/aa/package.json'));
    assert(pkg);
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
});
