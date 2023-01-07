const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
const coffee = require('coffee');
const assertFile = require('assert-file');
const helper = require('./helper');
const { rimraf } = require('../lib/utils');

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
  // afterEach(cleanup);

  it('should uninstall ok', async () => {
    await coffee.fork(npmuninstall, [ 'koa', 'pkg@1.0.0' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .end();
    assertFile.fail(path.join(root, 'node_modules/koa'));
    assertFile.fail(path.join(root, 'node_modules/pkg'));
    assertFile.fail(path.join(root, 'node_modules/.store/pkg@1.0.0/node_modules/pkg'));
  });

  it('should uninstall --save', async () => {
    await coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save' ], {
      cwd: root,
      stdio: 'pipe',
    })
      .debug()
      .expect('code', 0)
      .end();

    assertFile.fail(path.join(root, 'node_modules/pkg'));
    assertFile.fail(path.join(root, 'node_modules/.store/pkg@1.0.0/node_modules/pkg'));
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(!pkg.dependencies.pkg);
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
});
