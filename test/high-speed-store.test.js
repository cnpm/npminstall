'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const fs = require('fs/promises');
const helper = require('./helper');
const { rimraf } = require('../lib/utils');

describe('test/high-speed-store.test.js', () => {
  const cwd = helper.fixtures('high-speed-store');
  const cleanup = helper.cleanup(cwd);
  const storeScript = path.join(cwd, 'store.js');

  beforeEach(async () => {
    await cleanup();
    await rimraf(path.join(cwd, 'tmp'));
  });
  afterEach(cleanup);

  it('should get tarball stream from store', async () => {
    await coffee.fork(helper.npminstall, [ '-d', `--high-speed-store=${storeScript}` ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    const pkg = require(path.join(cwd, 'node_modules/@types/react-dom/node_modules/@types/react/package.json'));
    assert(pkg.version === '15.0.4');
    const dirs = await fs.readdir(path.join(cwd, 'tmp'));
    console.log(dirs);
    assert(dirs.length === 2);
  });
});
