'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const fs = require('mz/fs');
const helper = require('./helper');

describe('test/flatten.test.js', () => {
  const tmp = helper.fixtures('flatten');
  const cleanup = helper.cleanup(tmp);
  const bin = helper.npminstall;

  async function getPkgVersion(subPath) {
    return JSON.parse(await fs.readFile(path.join(tmp, subPath))).version;
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  // unstable on node 14 https://github.com/cnpm/npminstall/pull/360/checks?check_run_id=3721928838
  it.skip('should force all koa to 1.1.0', async () => {
    await coffee.fork(bin, [ '-d', '--flatten', './mod1' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/mod1/node_modules/koa/package.json') === '1.1.0');
    assert(await getPkgVersion('node_modules/mod1/node_modules/mod2/node_modules/koa/package.json') === '1.1.0');
    assert(await getPkgVersion('node_modules/mod1/node_modules/mod3/node_modules/koa/package.json') === '1.1.0');
    assert(await getPkgVersion('node_modules/mod1/node_modules/mod4/node_modules/koa/package.json') === '0.10.0');
  });

  it('should force all koa to ~1.1.2', async () => {
    await coffee.fork(bin, [ '-d', '--flatten', './mod2' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/mod2/node_modules/koa/package.json') === '1.1.2');
    assert(await getPkgVersion('node_modules/mod2/node_modules/mod3/node_modules/koa/package.json') === '1.1.2');
    assert(await getPkgVersion('node_modules/mod2/node_modules/mod4/node_modules/koa/package.json') === '0.10.0');
  });

  // skip windows
  if (process.platform !== 'win32') {
    it('should not force koa version without flatten', async () => {
      await coffee.fork(bin, [ '-d', './mod1' ], { cwd: tmp })
        .debug()
        .expect('code', 0)
        .expect('stdout', /All packages installed/)
        .end();
      assert(await getPkgVersion('node_modules/mod1/node_modules/koa/package.json') === '1.1.0');
      assert(await getPkgVersion('node_modules/mod1/node_modules/mod2/node_modules/koa/package.json') === '1.1.2');
      assert(await getPkgVersion('node_modules/mod1/node_modules/mod3/node_modules/koa/package.json') !== '1.1.0');
      assert(await getPkgVersion('node_modules/mod1/node_modules/mod4/node_modules/koa/package.json') === '0.10.0');
    });
  }

  it('should use first debug@2.2.0', async () => {
    await coffee.fork(bin, [ '-d', '--flatten', './mod5' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/mod5/node_modules/mod6/node_modules/mod7/node_modules/debug/package.json') === '2.2.0');
    assert(await getPkgVersion('node_modules/mod5/node_modules/mod6/node_modules/debug/package.json') === '0.7.4');
    assert(await getPkgVersion('node_modules/mod5/node_modules/debug/package.json') === '2.2.0');
  });

  it('should not use first debug@2.2.0 without flatten flag', async () => {
    await coffee.fork(bin, [ '-d', './mod5' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/mod5/node_modules/mod6/node_modules/mod7/node_modules/debug/package.json') !== '2.2.0');
    assert(await getPkgVersion('node_modules/mod5/node_modules/mod6/node_modules/debug/package.json') === '0.7.4');
    assert(await getPkgVersion('node_modules/mod5/node_modules/debug/package.json') === '2.2.0');
  });

  it('should flatten when version ends with x', async () => {
    await coffee.fork(bin, [ '-d', './mod8' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/mod8/node_modules/mod9/node_modules/debug/package.json') === '1.0.1');
    assert(await getPkgVersion('node_modules/mod8/node_modules/mod10/node_modules/debug/package.json') === '1.0.1');
    assert(await getPkgVersion('node_modules/mod8/node_modules/debug/package.json') === '1.0.1');
  });
});
