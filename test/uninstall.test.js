const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const fs = require('fs/promises');
const helper = require('./helper');
const { rimraf, existsSync } = require('../lib/utils');

describe('test/uninstall.test.js', () => {
  const npmuninstall = path.join(__dirname, '../bin/uninstall.js');
  const root = helper.fixtures('uninstall');
  const cleanupModules = helper.cleanup(root);

  async function cleanup() {
    await cleanupModules();
    await rimraf(path.join(root, 'package.json'));
  }

  beforeEach(async () => {
    await cleanup();
    const content = await fs.readFile(path.join(root, 'package.json.template'));
    await fs.writeFile(path.join(root, 'package.json'), content);
    await coffee.fork(helper.npminstall, [], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();
  });
  afterEach(cleanup);

  it('should uninstall ok', async () => {
    await coffee.fork(npmuninstall, [ 'koa', 'pkg@1.0.0' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();
    assert(!existsSync(path.join(root, 'node_modules/koa')));
    assert(!existsSync(path.join(root, 'node_modules/pkg')));
    assert(!existsSync(path.join(root, 'node_modules/_pkg@1.0.0@pkg')));
  });

  it('should uninstall --save', async () => {
    await coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();

    assert(!existsSync(path.join(root, 'node_modules/_pkg@1.0.0@pkg')));
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(!pkg.dependencies.pkg);
  });

  it('should uninstall --save-dev', async () => {
    await coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save-dev' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();

    assert(!existsSync(path.join(path.join(root, 'node_modules/pkg'))));
    assert(!existsSync(path.join(path.join(root, 'node_modules/_pkg@1.0.0@pkg'))));
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(!pkg.devDependencies.pkg);
  });

  it('should uninstall --save-optional', async () => {
    await coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save-optional' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();

    assert(!existsSync(path.join(path.join(root, 'node_modules/pkg'))));
    assert(!existsSync(path.join(path.join(root, 'node_modules/_pkg@1.0.0@pkg'))));
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(!pkg.optionalDependencies.pkg);
  });

  it('should prune package.json by default', async () => {
    await coffee.fork(npmuninstall, [ 'pkg@1.0.0' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    const depKeys = [ 'dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies' ];
    depKeys.forEach(key => assert(!pkg[key].pkg));
  });

  it('should not uninstall when version not match', async () => {
    await coffee.fork(npmuninstall, [ 'pkg@1.0.1', '--save-optional' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();

    assert(existsSync(path.join(root, 'node_modules/pkg')));
    assert(existsSync(path.join(root, 'node_modules/.store/pkg@1.0.0')));
  });

  it('should not uninstall when name not match', async () => {
    await coffee.fork(npmuninstall, [ 'pkg1@1.0.0', '--save-optional' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();

    assert(existsSync(path.join(root, 'node_modules/pkg')));
    assert(existsSync(path.join(root, 'node_modules/.store/pkg@1.0.0')));
    assert(!existsSync(path.join(root, 'node_modules/pkg1')));
    assert(!existsSync(path.join(root, 'node_modules/.store/pkg1@1.0.0')));
  });
});
