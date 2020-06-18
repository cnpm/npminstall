'use strict';

const rimraf = require('mz-modules/rimraf');
const path = require('path');
const coffee = require('coffee');
const helper = require('./helper');
const assert = require('assert');


let root;
async function cleanup() {
  rimraf(path.join(root, 'node_modules'));
}

describe('test/alias.test.js', () => {
  describe('npminstall support alias', () => {
    before(() => {
      root = helper.fixtures('alias');
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
      const pkg = await helper.readJSON(path.join(root, 'node_modules/egg-alias/package.json'));
      assert(pkg.name === 'egg');
    });
  });
});
