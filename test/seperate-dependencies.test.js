const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const readJSON = require('../lib/utils').readJSON;
const helper = require('./helper');

describe('test/seperate-dependencies.test.js', () => {
  const cwd = helper.fixtures('seperate-dependencies');
  const cleanup = helper.cleanup(cwd);

  async function checkPkg(name, version) {
    const pkgFile = path.join(cwd, 'node_modules', name, 'package.json');
    const pkg = await readJSON(pkgFile);
    assert.equal(pkg.version, version);
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install all', async () => {
    await coffee.fork(helper.npminstall, [], {
      cwd,
    })
      .debug()
      .expect('code', 0)
      .end();
    await checkPkg('koa', '1.0.0');
    await checkPkg('mocha', '3.0.0');
    await checkPkg('react', '15.0.0');
    await checkPkg('webpack', '3.0.0');
    await checkPkg('utility', '1.0.0');
  });

  it('should install production', async () => {
    await coffee.fork(helper.npminstall, [ '--production' ], {
      cwd,
    })
      .end();
    await checkPkg('koa', '1.0.0');
    await checkPkg('mocha', undefined);
    await checkPkg('react', undefined);
    await checkPkg('webpack', undefined);
    await checkPkg('utility', '1.0.0');
  });

  it('should install client', async () => {
    await coffee.fork(helper.npminstall, [ '--client', '--prodcution' ], {
      cwd,
    })
      .end();
    await checkPkg('koa', undefined);
    await checkPkg('mocha', undefined);
    await checkPkg('react', '15.0.0');
    await checkPkg('webpack', '3.0.0');
    await checkPkg('utility', '1.0.0');
  });
});
