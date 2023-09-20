const coffee = require('coffee');
const path = require('node:path');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const { lockfileConverter } = require('../lib/lockfile_resolver');
const Nested = require('../lib/nested');
const helper = require('./helper');

describe('test/install-with-lockfile.test.js', () => {
  const cwd = helper.fixtures('lockfile');
  const lockfile = require(path.join(cwd, 'package-lock.json'));
  const nested = new Nested([]);
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  // the Windows path sucks, shamefully skip these tests
  if (process.platform !== 'win32') {
    it('should install successfully', async () => {
      await coffee.fork(
        helper.npminstall,
        [
          '--lockfile-path',
          path.join(cwd, 'package-lock.json'),
        ], { cwd })
        .debug()
        .expect('code', 0)
        .notExpect('stdout', 'TypeError: Cannot read properties of undefined (reading \'ignoreOptionalDependencies\')')
        .end();
      assert.strictEqual(
        await fs.readlink(path.join(cwd, 'node_modules', 'lodash.has3'), 'utf8'),
        '_lodash.has@3.2.1@lodash.has'
      );

      assert.strictEqual(
        await fs.readlink(path.join(cwd, 'node_modules', 'lodash.has'), 'utf8'),
        '_lodash.has@4.0.0@lodash.has'
      );
    });

    it('should convert package-lock.json to .dependencies-tree.json successfully', () => {
      const dependenciesTree = lockfileConverter(lockfile, {
        ignoreOptionalDependencies: true,
      }, nested);

      assert.strictEqual(Object.keys(dependenciesTree).length, 29);
    });
  }
});
