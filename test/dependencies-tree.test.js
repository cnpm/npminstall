const path = require('node:path');
const coffee = require('coffee');
const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const assert = require('node:assert');
const helper = require('./helper');

describe('test/dependencies-tree.test.js', () => {
  const cwd = helper.fixtures('dependencies-tree');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install save dependencies tree', async () => {
    await coffee.fork(helper.npminstall, [ '-c', '--save-dependencies-tree' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    const file = path.join(cwd, 'node_modules/.dependencies_tree.json');
    const tree = JSON.parse(await fs.readFile(file, 'utf8'));
    assert(tree['koa@^2.0.0']);
    assert(tree['mocha@3']);
  });

  it('should install from dependencies tree work', async () => {
    await coffee.fork(helper.npminstall, [ '-c', '--dependencies-tree=.dependencies_tree.json' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stderr', /json 0\(0B\)/)
      .end();
    const file = path.join(cwd, 'node_modules/.dependencies_tree.json');
    assert(!existsSync(file));
  });
});
