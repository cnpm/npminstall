'use strict';

const assert = require('assert');
const rimraf = require('mz-modules/rimraf');
const path = require('path');
const coffee = require('coffee');
const readJSON = require('../lib/utils').readJSON;
const helper = require('./helper');

let root;
async function cleanup() {
  rimraf(path.join(root, 'node_modules'));
}

async function checkPkg(name, version) {
  const pkg = await readJSON(path.join(root, 'node_modules', name, 'package.json'));
  assert(pkg.version === version);
}

describe('test/resolutions.test.js', () => {
  describe('resolutions-error-format', () => {
    before(() => {
      root = helper.fixtures('resolutions-error-format');
      cleanup();
    });
    afterEach(cleanup);

    it('should install error', () => {
      return coffee.fork(helper.npminstall, {
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
      root = helper.fixtures('resolutions-error-endpoint');
      cleanup();
    });
    afterEach(cleanup);

    it('should install error', () => {
      return coffee.fork(helper.npminstall, {
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
      root = helper.fixtures('resolutions');
      cleanup();
    });
    afterEach(cleanup);

    it('should work', async () => {
      await coffee.fork(helper.npminstall, {
        cwd: root,
      })
        // .debug()
        .expect('code', 0)
        .end();

      await checkPkg('debug', '2.0.0');
      await checkPkg('koa/node_modules/debug', '1.0.0');
      await checkPkg('koa/node_modules/cookies', '0.7.0');
      await checkPkg('cookies', '0.7.1');
      await checkPkg('@koa/cors/node_modules/vary', '1.0.0');
    });
  });
});
