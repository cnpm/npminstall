'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('mz-modules/rimraf');
const coffee = require('coffee');
const fs = require('mz/fs');
const helper = require('./helper');

const npmlink = path.join(__dirname, '../bin/link.js');

describe('test/link-folder.test.js', () => {
  const root = helper.fixtures('link-demo');

  async function cleanup() {
    await rimraf(path.join(root, 'node_modules'));
    await rimraf(path.join(root, 'linked-package/node_modules'));
    await rimraf(path.join(root, 'linked-package-2/node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should link one folder work', async () => {
    await coffee.fork(npmlink, [ './linked-package' ], {
      cwd: root,
    })
      .debug()
      .expect('stderr', /npm_rootpath:.+link\-demo!!!!!/)
      .end();

    assert(await fs.exists(path.join(root, 'node_modules/linked-package')));
  });

  it('should link two folder work', async () => {
    await coffee.fork(npmlink, [ './linked-package', './linked-package-2', '-d' ], {
      cwd: root,
    })
      .debug()
      .end();

    assert(await fs.exists(path.join(root, 'node_modules/linked-package')));
    assert(await fs.exists(path.join(root, 'node_modules/linked-package-2')));
    // bin file should be exists
    assert(await fs.exists(path.join(root, 'node_modules/.bin/linked-package-2')));
  });
});
