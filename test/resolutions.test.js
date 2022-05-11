'use strict';

const assert = require('assert');
const rimraf = require('mz-modules/rimraf');
const path = require('path');
const fs = require('fs');
const coffee = require('coffee');
const { readJSON } = require('../lib/utils');
const helper = require('./helper');

let root;
async function cleanup() {
  rimraf(path.join(root, 'node_modules'));
}

async function checkPkg(name, version) {
  const pkg = await readJSON(path.join(root, 'node_modules', name, 'package.json'));
  assert(pkg.version === version);
}

function checkFileExisted(pathname) {
  return fs.existsSync(path.join(root, pathname));
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

  describe('resolutions file', () => {
    before(async () => {
      root = helper.fixtures('resolutions-file');
      cleanup();
      // prepare a gitignore file `index.js` for `packages/foo`
      await fs.promises.writeFile(path.join(root, 'packages/foo/index.js'), 'module.exports = "foo";');
    });

    afterEach(() => {
      cleanup();
      rimraf(path.join(root, 'packages/foo/index.js'));
    });

    it('should work', async () => {
      await coffee.fork(helper.npminstall, {
        cwd: root,
      })
        .debug()
        .expect('code', 0)
        .end();

      await checkPkg('bar', '1.0.0');
      await checkPkg('bar1', '1.0.0');
      await checkPkg('foo', '1.0.0');
      await checkPkg('foo1', '1.0.0');
      await checkPkg('bar/node_modules/foo', '1.0.0');
      await checkPkg('bar1/node_modules/foo', '1.0.0');
      await checkPkg('bar1/node_modules/bar', '1.0.0');
      await checkPkg('foo1/node_modules/bar', '1.0.0');
      await checkPkg('foo1/node_modules/bar1', '1.0.0');
      await checkPkg('foo1/node_modules/foo', '1.0.0');

      assert(checkFileExisted('packages/bar/src/index.js'), true);
      assert(checkFileExisted('packages/bar/main.js'), false);

      assert(checkFileExisted('packages/bar1/src/index.js'), true);
      assert(checkFileExisted('packages/bar1/main.js'), false);
      assert(checkFileExisted('packages/bar1/README.md'), false);

      assert(checkFileExisted('packages/foo/main.js'), false);
      assert(checkFileExisted('packages/foo/.gitignore'), false);

      assert(checkFileExisted('packages/foo1/main.js'), true);
      assert(checkFileExisted('packages/foo1/.npmrc'), true);
    });
  });
});
