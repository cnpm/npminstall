const assert = require('node:assert');
const path = require('node:path');
const coffee = require('coffee');
const helper = require('./helper');
const utils = require('../lib/utils');

describe('test/install-enable-prune.test.js', () => {
  describe('--prune', () => {
    const cwd = helper.fixtures('install-enable-prune');
    const cleanup = helper.cleanup(cwd);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install --prune', async () => {
      await coffee.fork(helper.npminstall, [ '--prune', '--production' ], { cwd })
        .debug()
        .expect('code', 0)
        .end();
      const exists = await utils.exists(path.join(cwd, 'node_modules/egg/README.md'));
      assert(!exists);
    });
  });

  describe('pkg.config.npminstall.prune', () => {
    const cwd = helper.fixtures('install-enable-prune-on-pkg');
    const cleanup = helper.cleanup(cwd);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install with prune', async () => {
      await coffee.fork(helper.npminstall, [], { cwd })
        .debug()
        .expect('code', 0)
        .end();
      const exists = await utils.exists(path.join(cwd, 'node_modules/egg/README.md'));
      assert(!exists);
      // should keep ts file
      assert(await utils.exists(path.join(cwd, 'node_modules/egg/index.d.ts')));
    });
  });
});
