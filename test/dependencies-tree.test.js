'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const fs = require('fs');
const assert = require('assert');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe.only('test/dependencies-tree.test.js', () => {

  const cwd = path.join(__dirname, 'fixtures', 'dependencies-tree');

  function cleanup() {
    rimraf.sync(path.join(cwd, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install save dependencies tree', function* () {
    yield coffee.fork(npminstall, [ '-c', '--save-dependencies-tree' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    const file = path.join(cwd, 'node_modules/.dependencies_tree.json');
    const tree = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(tree['koa@^2.0.0']);
    assert(tree['mocha@3']);
  });

  it('should install from dependencies tree work', function* () {
    yield coffee.fork(npminstall, [ '-c', '--dependencies-tree=.dependencies_tree.json' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stderr', /json 0\(0B\)/)
      .end();
    const file = path.join(cwd, 'node_modules/.dependencies_tree.json');
    assert(!fs.existsSync(file));
  });
});
