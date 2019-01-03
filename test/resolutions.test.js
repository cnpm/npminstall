'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const coffee = require('coffee');

const bin = path.join(__dirname, '../bin/install.js');

let root;
function cleanup() {
  rimraf.sync(path.join(root, 'node_modules'));
}

function* checkPkg(name, version) {
  const pkg = yield readJSON(path.join(root, 'node_modules', name, 'package.json'));
  assert.equal(pkg.version, version);
}

describe('test/seperate-dependencies.test.js', () => {
  describe('resolutions-error-format', () => {
    before(() => {
      root = path.join(__dirname, 'fixtures', 'resolutions-error-format');
      cleanup();
    });
    afterEach(cleanup);

    it('should install error', () => {
      return coffee.fork(bin, {
        cwd: root,
      })
      // .debug()
      .expect('code', 1)
      .expect('stderr', /resolution package foo\/\*\* format error/)
      .end();
    });
  });

  describe('resolutions-error-endpoint', () => {
    before(() => {
      root = path.join(__dirname, 'fixtures', 'resolutions-error-endpoint');
      cleanup();
    });
    afterEach(cleanup);

    it('should install error', () => {
      return coffee.fork(bin, {
        cwd: root,
      })
      // .debug()
      .expect('code', 1)
      .expect('stderr', /resolution package foo\/bar-\* format error/)
      .end();
    });
  });

  describe('resolutions', () => {
    before(() => {
      root = path.join(__dirname, 'fixtures', 'resolutions');
      cleanup();
    });
    afterEach(cleanup);

    it('should work', function* () {
      yield coffee.fork(bin, {
        cwd: root,
      })
      .debug()
      .expect('code', 0)
      .end();

      yield checkPkg('debug', '2.0.0');
      yield checkPkg('koa/node_modules/debug', '1.0.0');
      yield checkPkg('koa/node_modules/cookies', '0.7.0');
      yield checkPkg('cookies', '0.7.1');

    });
  });
});
