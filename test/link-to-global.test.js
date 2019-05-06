'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('mz-modules/rimraf');
const coffee = require('coffee');
const fs = require('mz/fs');

const npmlink = path.join(__dirname, '../bin/link.js');

describe('test/link-to-global.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'link-demo');
  const prefix = path.join(__dirname, 'fixtures', 'npm-global');
  const libDir = process.platform === 'win32' ? prefix : path.join(prefix, 'lib');
  const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');

  async function cleanup() {
    await rimraf(path.join(prefix, 'node_modules'));
    await rimraf(path.join(root, 'linked-package/node_modules'));
    await rimraf(path.join(root, 'linked-package-2/node_modules'));
    await rimraf(libDir);
    await rimraf(binDir);
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should link without bin', async () => {
    await coffee.fork(npmlink, [ `--prefix=${prefix}` ], {
      cwd: path.join(root, 'linked-package'),
    })
      .debug()
      .end();

    assert(await fs.exists(path.join(libDir, 'node_modules/linked-package')));
  });

  it('should link with bin', async () => {
    await coffee.fork(npmlink, [ `--prefix=${prefix}` ], {
      cwd: path.join(root, 'linked-package-2'),
    })
      .debug()
      .end();

    assert(await fs.exists(path.join(libDir, 'node_modules/linked-package-2')));
    // bin file should be exists
    assert(await fs.exists(path.join(binDir, 'linked-package-2')));
  });
});
