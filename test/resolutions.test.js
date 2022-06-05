'use strict';

const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const { rimraf, readJSON } = require('../lib/utils');
const helper = require('./helper');

let root;
async function cleanup() {
  await rimraf(path.join(root, 'node_modules'));
}

async function checkPkg(name, version) {
  const pkg = await readJSON(path.join(root, 'node_modules', name, 'package.json'));
  assert(pkg.version === version);
}

describe('test/resolutions.test.js', () => {
  describe('resolutions-error-format', () => {
    before(async () => {
      root = helper.fixtures('resolutions-error-format');
      await cleanup();
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

  describe('resolutions alias', () => {
    before(() => {
      root = helper.fixtures('resolutions-alias');
      cleanup();
    });

    afterEach(cleanup);

    it('should work', async () => {
      await coffee.fork(helper.npminstall, {
        cwd: root,
      })
        .debug()
        .expect('code', 0)
        .end();

      const pkgJSON = require(path.join(root, 'node_modules', 'object-pipeline/node_modules/lodash.has/package.json'));
      assert.strictEqual(pkgJSON.name, 'lodash.get');
      assert.strictEqual(pkgJSON.version, '4.4.2');
    });
  });
});
