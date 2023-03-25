const coffee = require('coffee');
const path = require('node:path');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const helper = require('./helper');

describe('test/flatten.test.js', () => {
  const tmp = helper.fixtures('flatten');
  const cleanup = helper.cleanup(tmp);
  const bin = helper.npminstall;

  async function getPkgVersion(subPath) {
    return JSON.parse(await fs.readFile(path.join(tmp, subPath))).version;
  }

  beforeEach(cleanup);
  // afterEach(cleanup);

  it('should force all koa to ~1.1.2', async () => {
    await coffee.fork(bin, [ '-d', '--flatten', './mod2' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/mod2/package.json') === '1.0.0');
    assert(await getPkgVersion('node_modules/.store/mod2@1.0.0/node_modules/mod3/package.json') === '1.0.0');
    assert(await getPkgVersion('node_modules/.store/mod2@1.0.0/node_modules/mod4/package.json') === '1.0.0');
    assert(await getPkgVersion('node_modules/.store/mod2@1.0.0/node_modules/koa/package.json') === '1.1.2');
    assert(await getPkgVersion('node_modules/.store/mod3@1.0.0/node_modules/koa/package.json') === '1.1.2');
    assert(await getPkgVersion('node_modules/.store/mod4@1.0.0/node_modules/koa/package.json') === '0.10.0');
  });

  it('should use first debug@2.2.0', async () => {
    await coffee.fork(bin, [ '-d', '--flatten', './mod5' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/.store/mod7@1.0.0/node_modules/debug/package.json') === '2.2.0');
    assert(await getPkgVersion('node_modules/.store/mod6@1.0.0/node_modules/debug/package.json') === '0.7.4');
    assert(await getPkgVersion('node_modules/.store/mod5@1.0.0/node_modules/debug/package.json') === '2.2.0');
  });

  it('should not use first debug@2.2.0 without flatten flag', async () => {
    await coffee.fork(bin, [ '-d', './mod5' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/.store/mod7@1.0.0/node_modules/debug/package.json') !== '2.2.0');
    assert(await getPkgVersion('node_modules/.store/mod6@1.0.0/node_modules/debug/package.json') === '0.7.4');
    assert(await getPkgVersion('node_modules/.store/mod5@1.0.0/node_modules/debug/package.json') === '2.2.0');
  });

  it('should flatten when version ends with x', async () => {
    await coffee.fork(bin, [ '-d', './mod8' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(await getPkgVersion('node_modules/.store/mod9@1.0.0/node_modules/debug/package.json') === '1.0.1');
    assert(await getPkgVersion('node_modules/.store/mod10@1.0.0/node_modules/debug/package.json') === '1.0.1');
    assert(await getPkgVersion('node_modules/.store/mod8@1.0.0/node_modules/debug/package.json') === '1.0.1');
  });
});
