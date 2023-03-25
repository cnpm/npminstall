const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const fse = require('fs-extra');
const coffee = require('coffee');
const assertFile = require('assert-file');
const { rimraf } = require('../lib/utils');
const helper = require('./helper');

describe('test/install-workpsaces.test.js', () => {
  const root = helper.fixtures('npm-workspaces');
  const [ tmp, cleanupTmpDir ] = helper.tmp();
  const cleanup = helper.cleanup(root);

  beforeEach(async () => {
    await cleanup();
    await cleanupTmpDir();
    await rimraf(path.join(root, 'packages/a/node_modules'));
    await rimraf(path.join(root, 'packages/b/node_modules'));
    await rimraf(path.join(root, 'core/foo/node_modules'));
    await rimraf(path.join(root, 'core/bar/node_modules'));
    await rimraf(path.join(root, 'core/scoped/node_modules'));
    await rimraf(path.join(root, 'packages/c'));
    await fs.copyFile(path.join(root, 'package-init.json'), path.join(root, 'package.json'));
    await fse.copy(root, tmp);
  });

  it('should install all on root', async () => {
    await coffee.fork(helper.npminstall, [], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    let pkg = await helper.readJSON(path.join(root, 'node_modules/aa/package.json'));
    assert.equal(pkg.name, 'aa');
    // add peerDependencies to store
    assertFile(path.join(root, 'packages/a/node_modules/egg/package.json'));
    assertFile(path.join(root, 'packages/a/node_modules/egg-mock/package.json'));
    pkg = await helper.readJSON(path.join(root, 'packages/a/node_modules/egg-mock/package.json'));
    assert.equal(pkg.name, 'egg-mock');
    assertFile(path.join(root, `node_modules/.store/egg-mock@${pkg.version}/node_modules/egg/package.json`));
    // should link workspace package deps to workspace root node_modules
    assertFile(path.join(root, 'node_modules/egg-mock/package.json'));
    assertFile(path.join(root, 'node_modules/egg/package.json'));
    assertFile(path.join(root, 'node_modules/abbrev/package.json'));
    pkg = await helper.readJSON(path.join(root, 'node_modules/aa/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '2.0.0');
    pkg = await helper.readJSON(path.join(root, 'packages/a/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '2.0.0');
    pkg = await helper.readJSON(path.join(root, 'node_modules/b/package.json'));
    assert.equal(pkg.name, 'b');
    pkg = await helper.readJSON(path.join(root, 'node_modules/b/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '1.1.1');
    pkg = await helper.readJSON(path.join(root, 'packages/b/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '1.1.1');
    pkg = await helper.readJSON(path.join(root, 'node_modules/abbrev-range/package.json'));
    assert.equal(pkg.name, 'abbrev-range');
    pkg = await helper.readJSON(path.join(root, 'node_modules/foo/package.json'));
    assert.equal(pkg.name, 'foo');
    pkg = await helper.readJSON(path.join(root, 'node_modules/bar/package.json'));
    assert.equal(pkg.name, 'bar');
    // foo don't install, it was workspace package
    assertFile.fail(path.join(root, 'node_modules/bar/node_modules/foo/package.json'));
    pkg = await helper.readJSON(path.join(root, 'node_modules/@cnpm/foo/package.json'));
    assert.equal(pkg.name, '@cnpm/foo');
    assertFile.fail(path.join(root, 'node_modules/@cnpm/foo/node_modules/foo/package.json'));

    // match publicHoistPattern pick eslint* modules to root node_modules
    assertFile(path.join(root, 'node_modules/eslint-config-egg/package.json'));
    assertFile(path.join(root, 'node_modules/eslint-plugin-eggache/package.json'));
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

    // should support workspace-path
    await coffee.fork(helper.npminstall, [ 'abbrev@1.1.0', '--workspace', 'packages/c' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(pkg.dependencies.abbrev, '^1.1.0');
  });

  it('should install/uninstall a package on all workspaces', async () => {
    // npm install pedding --workspaces
    await coffee.fork(helper.npminstall, [ 'pedding', '--workspaces' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    let pkg = await helper.readJSON(path.join(tmp, 'packages/a/package.json'));
    assert.equal(pkg.name, 'aa');
    assert.equal(typeof pkg.dependencies.pedding, 'string');
    pkg = await helper.readJSON(path.join(tmp, 'packages/b/package.json'));
    assert.equal(pkg.name, 'b');
    assert.equal(typeof pkg.dependencies.pedding, 'string');
    pkg = await helper.readJSON(path.join(tmp, 'core/foo/package.json'));
    assert.equal(pkg.name, 'foo');
    assert.equal(typeof pkg.dependencies.pedding, 'string');

    await coffee.fork(helper.npminstall, [ 'pedding@1.0.0', '--workspaces', '-D' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(path.join(tmp, 'packages/a/package.json'));
    assert.equal(pkg.name, 'aa');
    assert.equal(pkg.devDependencies.pedding, '^1.0.0');
    pkg = await helper.readJSON(path.join(tmp, 'packages/b/package.json'));
    assert.equal(pkg.name, 'b');
    assert.equal(pkg.devDependencies.pedding, '^1.0.0');
    pkg = await helper.readJSON(path.join(tmp, 'core/foo/package.json'));
    assert.equal(pkg.name, 'foo');
    assert.equal(pkg.devDependencies.pedding, '^1.0.0');
    assertFile(path.join(tmp, 'core/foo/node_modules/pedding'));

    // uninstall --workspaces
    await coffee.fork(helper.npmuninstall, [ 'pedding', '--workspaces' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(path.join(tmp, 'packages/a/package.json'));
    assert.equal(pkg.name, 'aa');
    assert.equal(pkg.devDependencies.pedding, undefined);
    pkg = await helper.readJSON(path.join(tmp, 'packages/b/package.json'));
    assert.equal(pkg.name, 'b');
    assert.equal(pkg.devDependencies.pedding, undefined);
    pkg = await helper.readJSON(path.join(tmp, 'core/foo/package.json'));
    assert.equal(pkg.name, 'foo');
    assert.equal(pkg.devDependencies.pedding, undefined);
    assertFile.fail(path.join(tmp, 'core/foo/node_modules/pedding'));
    await coffee.fork(helper.npmuninstall, [ 'pedding' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
  });

  it('should install workspace-package on one workspace', async () => {
    const pkgDir = path.join(root, 'packages/c');
    await fs.mkdir(pkgDir, { recursive: true });
    const pkgFile = path.join(pkgDir, 'package.json');
    await fs.writeFile(pkgFile, JSON.stringify({
      name: 'c',
    }));
    await coffee.fork(helper.npminstall, [ 'aa', '-w', 'c' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    let pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(pkg.dependencies.aa, '^1.0.0');
    // add dependencies only
    pkg = await helper.readJSON(path.join(root, 'node_modules/aa/package.json'));
    assert.equal(pkg.name, 'aa');
    pkg = await helper.readJSON(path.join(root, 'packages/c/node_modules/aa/package.json'));
    assert.equal(pkg.name, undefined);
    await coffee.fork(helper.npminstall, [ 'aa@1', '-w', 'c' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(pkg.dependencies.aa, '^1.0.0');
    // wrong version should work
    await coffee.fork(helper.npminstall, [ 'aa@2', '-w', 'c' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(pkg.dependencies.aa, '^1.0.0');
    // scoped package work
    await coffee.fork(helper.npminstall, [ '@cnpm/foo', '-w', 'c', '--save-dev' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.name, 'c');
    assert.equal(pkg.devDependencies['@cnpm/foo'], '^1.0.0');
  });

  it('should install workspace-package on root', async () => {
    const pkgFile = path.join(root, 'package.json');
    await coffee.fork(helper.npminstall, [ 'aa' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    let pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.dependencies.aa, '^1.0.0');
    // scoped package work
    await coffee.fork(helper.npminstall, [ '@cnpm/foo' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    pkg = await helper.readJSON(pkgFile);
    assert.equal(pkg.dependencies['@cnpm/foo'], '^1.0.0');
    await coffee.fork(helper.npminstall, [], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
  });

  it('should throw error when workspace not exists', async () => {
    await coffee.fork(helper.npminstall, [ 'abbrev', '--workspace', 'not-exists' ], { cwd: root })
      .debug()
      .expect('code', 1)
      .expect('stderr', /No workspaces found: --workspace=not-exists/)
      .end();
  });

  // https://docs.npmjs.com/cli/v8/commands/npm-install#workspace
  it('should install workspace-package on path to a parent workspace directory', async () => {
    await coffee.fork(helper.npminstall, [ 'egg', '--workspace', 'core' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    let pkgFile = path.join(root, 'core/bar/node_modules/egg/package.json');
    assertFile(pkgFile);
    let pkg = await helper.readJSON(path.join(root, 'core/bar/package.json'));
    assert.equal(typeof pkg.dependencies.egg, 'string');
    pkgFile = path.join(root, 'core/foo/node_modules/egg/package.json');
    assertFile(pkgFile);
    pkg = await helper.readJSON(path.join(root, 'core/foo/package.json'));
    assert.equal(typeof pkg.dependencies.egg, 'string');
    pkgFile = path.join(root, 'core/scoped/node_modules/egg/package.json');
    assertFile(pkgFile);
    pkg = await helper.readJSON(path.join(root, 'core/scoped/package.json'));
    assert.equal(typeof pkg.dependencies.egg, 'string');
    // uninstall should work
    await coffee.fork(helper.npmuninstall, [ 'egg', '--save', '--workspace', 'core' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .end();
    assertFile.fail(path.join(root, 'core/foo/node_modules/egg/package.json'));
    pkg = await helper.readJSON(path.join(root, 'core/bar/package.json'));
    assert.equal(pkg.dependencies.egg, undefined);
  });

  it('should throw error when workspace not exists', async () => {
    await coffee.fork(helper.npminstall, [ 'abbrev', '--workspace', 'not-exists' ], { cwd: root })
      .debug()
      .expect('code', 1)
      .expect('stderr', /No workspaces found: --workspace=not-exists/)
      .end();
  });

  it('should update all on root', async () => {
    await coffee.fork(helper.npmupdate, [], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stdout', /\[npmupdate] removing/)
      .end();

    let pkg = await helper.readJSON(path.join(root, 'node_modules/aa/package.json'));
    assert.equal(pkg.name, 'aa');
    pkg = await helper.readJSON(path.join(root, 'node_modules/aa/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '2.0.0');
  });

  it('should update one workspace', async () => {
    await coffee.fork(helper.npmupdate, [ '-w', 'aa' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stdout', /\[npmupdate] removing/)
      .end();

    let pkg = await helper.readJSON(path.join(root, 'node_modules/aa/package.json'));
    assert.equal(pkg.name, 'aa');
    pkg = await helper.readJSON(path.join(root, 'node_modules/aa/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '2.0.0');
    // dont install b deps
    assertFile.fail(path.join(root, 'node_modules/b/node_modules/abbrev/package.json'));

    // support workpsace-path
    await coffee.fork(helper.npmupdate, [ '-w', 'packages/a' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stdout', /\[npmupdate] removing/)
      .end();
    pkg = await helper.readJSON(path.join(root, 'node_modules/aa/node_modules/abbrev/package.json'));
    assert.equal(pkg.name, 'abbrev');
    assert.equal(pkg.version, '2.0.0');
  });
});
