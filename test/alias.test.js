'use strict';

const rimraf = require('mz-modules/rimraf');
const path = require('path');
const coffee = require('coffee');
const helper = require('./helper');
const assert = require('assert');
const fs = require('mz/fs');


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

  describe('npminstall install -g support alias', () => {
    const [ tmp, cleanup ] = helper.tmp();
    let libDir = path.join(tmp, 'lib');
    if (process.platform === 'win32') {
      libDir = tmp;
    }
    beforeEach(cleanup);
    afterEach(cleanup);
    it('should global install work', async () => {
      await coffee.fork(helper.npminstall, [
        `--prefix=${tmp}`,
        '-g',
        'egg-alias@npm:egg@1',
      ])
        .debug()
        .expect('stdout', /All packages installed/)
        .expect('code', 0)
        .end();

      assert(await fs.exists(path.join(libDir, 'node_modules/egg-alias')));
    });
  });
});
