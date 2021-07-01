'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const coffee = require('coffee');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/production.test.js', () => {
  const cwd = helper.fixtures('production');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should ignore devDependencies when install with production', async () => {
    await npminstall({
      root: cwd,
      production: true,
    });

    const dirs = await fs.readdir(path.join(cwd, 'node_modules'));
    assert(!dirs.includes('mocha'));
    assert(dirs.includes('should'));
    assert(dirs.includes('koa'));
  });

  it('should show detail and check node_modules dir on production mode', async () => {
    await coffee.fork(helper.npminstall, [ '--production' ], { cwd })
      .expect('code', 0)
      .expect('stdout', /installed at node_modules/)
      .end();
    // again
    await coffee.fork(helper.npminstall, [ '--production' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /koa@\* is skipped because it already exists at/)
      .expect('stderr', /npminstall WARN node_modules exists: .+?node_modules/)
      .end();
  });
});
