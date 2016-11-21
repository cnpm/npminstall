'use strict';

const assert = require('power-assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');

describe('test/install-save-folder.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'tmp');
  const demo = path.join(__dirname, 'fixtures', 'demo');

  function cleanup() {
    rimraf.sync(root);
  }

  beforeEach(() => {
    cleanup();
    fs.mkdir(root);
  });
  afterEach(cleanup);

  it('should --save install work', function* () {
    yield coffee.fork(npminstall, [ '--save', demo ], {
      cwd: root,
    })
    .debug()
    .end();

    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
    assert(pkg.dependencies.demo, '^1.0.0');
    assert(fs.existsSync(path.join(root, 'node_modules/demo')));
  });

  it('should --save-dev install work', function* () {
    yield coffee.fork(npminstall, [ '--save-dev', demo ], {
      cwd: root,
    })
    .debug()
    .end();

    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
    assert(pkg.devDependencies.demo, '^1.0.0');
    assert(fs.existsSync(path.join(root, 'node_modules/demo')));
  });
});
