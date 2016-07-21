'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');
const npmuninstall = path.join(__dirname, '../bin/uninstall.js');
const fs = require('mz/fs');

describe('test/uninstall.test.js', function() {
  const root = path.join(__dirname, 'fixtures', 'uninstall');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(path.join(root, 'package.json'));
  }

  beforeEach(done => {
    const content = fs.readFileSync(path.join(root, 'package.json.template'));
    fs.writeFileSync(path.join(root, 'package.json'), content);
    coffee.fork(npminstall, [], {
      cwd: root,
      stdio: 'pipe',
    }).end(done);
  });

  afterEach(cleanup);

  it('should uninstall ok', done => {
    coffee.fork(npmuninstall, [ 'koa', 'pkg@1.0.0' ], {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/koa'))));
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/pkg'))));
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/.pkg@1.0.0'))));
      done();
    });
  });

  it('should uninstall --save', done => {
    coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save' ], {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/.pkg@1.0.0'))));
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
      assert(!pkg.dependencies.pkg);
      done();
    });
  });

  it('should uninstall --save-dev', done => {
    coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save-dev' ], {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/pkg'))));
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/.pkg@1.0.0'))));
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
      assert(!pkg.devDependencies.pkg);
      done();
    });
  });

  it('should uninstall --save-optional', done => {
    coffee.fork(npmuninstall, [ 'pkg@1.0.0', '--save-optional' ], {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/pkg'))));
      assert(!fs.existsSync(path.join(path.join(root, 'node_modules/.pkg@1.0.0'))));
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
      assert(!pkg.optionalDependencies.pkg);
      done();
    });
  });

  it('should not uninstall when version not match', done => {
    coffee.fork(npmuninstall, [ 'pkg@1.0.1', '--save-optional' ], {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(fs.existsSync(path.join(path.join(root, 'node_modules/pkg'))));
      assert(fs.existsSync(path.join(path.join(root, 'node_modules/.pkg@1.0.0'))));
      done();
    });
  });

  it('should not uninstall when name not match', done => {
    coffee.fork(npmuninstall, [ 'pkg1@1.0.0', '--save-optional' ], {
      cwd: root,
      stdio: 'pipe',
    }).end(() => {
      assert(fs.existsSync(path.join(path.join(root, 'node_modules/.pkg@1.0.0'))));
      done();
    });
  });
});
