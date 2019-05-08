'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const coffee = require('coffee');
const helper = require('./helper');

describe('test/install-save-folder.test.js', () => {
  const [ root, cleanup ] = helper.tmp();
  const demo = helper.fixtures('demo');

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should --save install work', async () => {
    await coffee.fork(helper.npminstall, [ '--save', demo ], {
      cwd: root,
    })
      // .debug()
      .end();

    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(pkg.dependencies.demo, '^1.0.0');
    assert(await fs.exists(path.join(root, 'node_modules/demo')));
  });

  it('should --save-dev install work', async () => {
    await coffee.fork(helper.npminstall, [ '--save-dev', demo ], {
      cwd: root,
    })
      // .debug()
      .end();

    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(pkg.devDependencies.demo, '^1.0.0');
    assert(await fs.exists(path.join(root, 'node_modules/demo')));
  });

  it('should --save-client install work', async () => {
    await coffee.fork(helper.npminstall, [ '--save-client', demo ], {
      cwd: root,
    })
      // .debug()
      .end();

    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(pkg.clientDependencies.demo, '^1.0.0');
    assert(await fs.exists(path.join(root, 'node_modules/demo')));
  });

  it('should --save-build install work', async () => {
    await coffee.fork(helper.npminstall, [ '--save-build', demo ], {
      cwd: root,
    })
      // .debug()
      .end();

    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(pkg.buildDependencies.demo, '^1.0.0');
    assert(await fs.exists(path.join(root, 'node_modules/demo')));
  });

  it('should --save-isomorphic install work', async () => {
    await coffee.fork(helper.npminstall, [ '--save-isomorphic', demo ], {
      cwd: root,
    })
      // .debug()
      .end();

    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    assert(pkg.isomorphicDependencies.demo, '^1.0.0');
    assert(await fs.exists(path.join(root, 'node_modules/demo')));
  });
});
