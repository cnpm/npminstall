const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const utils = require('../lib/utils');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/cleanup.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should remove donefile when install failed', async () => {
    let throwError = false;
    try {
      await npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: 'latest' },
        ],
      });
    } catch (err) {
      throwError = true;
    }
    assert(throwError);

    let done = await utils.isInstallDone(path.join(tmp, 'node_modules/.store/install-error@1.0.1/node_modules/install-error/package.json'));
    assert.equal(done, false);
    const dirs = await fs.readdir(path.join(tmp, 'node_modules'));
    assert.deepEqual(dirs, [ '.store' ]);

    // install again will try to download
    throwError = false;
    try {
      await npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: 'latest' },
        ],
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);
    done = await utils.isInstallDone(path.join(tmp, 'node_modules/.pnpm/install-error@1.0.1/node_modules/install-error/.npminstall.done'));
    assert.equal(done, false);
  });

  it('should remove donefile when execute postinstall script failed', async () => {
    let throwError = false;
    const pkgs = [{ version: '../postinstall-error', type: 'local' }];
    try {
      await npminstall({
        root: tmp,
        pkgs,
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);

    let done = await utils.isInstallDone(path.join(tmp, 'node_modules/.pnpm/postinstall-error@1.0.0/node_modules/postinstall-error/.npminstall.done'));
    assert.equal(done, false);

    // install again will try to download
    throwError = false;
    try {
      await npminstall({
        root: tmp,
        pkgs,
      });
    } catch (err) {
      throwError = true;
    }
    assert.equal(throwError, true);
    done = await utils.isInstallDone(path.join(tmp, 'node_modules/.pnpm/postinstall-error@1.0.0/node_modules/postinstall-error/.npminstall.done'));
    assert.equal(done, false);
  });
});
