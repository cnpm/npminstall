'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const rimraf = require('mz-modules/rimraf');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/concurrency-install.test.js', () => {
  const root1 = helper.fixtures('concurrency1');
  const root2 = helper.fixtures('concurrency2');
  const [ cacheDir, cleanupTmp ] = helper.tmp();

  async function cleanup() {
    await Promise.all([
      cleanupTmp(),
      rimraf(path.join(root1, 'node_modules')),
      rimraf(path.join(root2, 'node_modules')),
    ]);
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should concurrency install success', async () => {
    await Promise.all([
      npminstall({
        root: root1,
        cacheDir,
        detail: true,
      }),
      npminstall({
        root: root2,
        cacheDir,
        detail: true,
      }),
    ]);
    assert(await fs.exists(path.join(root1, 'node_modules/browserify')));
    assert(await fs.exists(path.join(root2, 'node_modules/browserify')));
  });
});
