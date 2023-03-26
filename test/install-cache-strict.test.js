const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const coffee = require('coffee');
const helper = require('./helper');

describe('test/install-cache-strict.test.js', () => {
  // Fixme: mock Windows homedir
  if (process.platform === 'win32') return;

  const [ homedir, cleanupTmp ] = helper.tmp();
  const demo = helper.fixtures('demo-install-cache-strict');
  const cleanupModules = helper.cleanup(demo);

  async function cleanup() {
    await cleanupModules();
    await cleanupTmp();
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should read disk cache on --cache-strict --production', async () => {
    await coffee.fork(helper.npminstall, [ '--cache-strict', '--production' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
      }),
    })
      .debug()
      .end();
    assert(await fs.stat(path.join(homedir, '.npminstall_tarball/d/e/b/u/debug')));
  });

  it('should read disk cache from npm_config_cache env', async () => {
    await coffee.fork(helper.npminstall, [], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
        npm_config_cache: path.join(homedir, 'foocache/.npminstall_tarball'),
      }),
    })
      .debug()
      .end();
    assert(await fs.stat(path.join(homedir, 'foocache/.npminstall_tarball/d/e/b/u/debug')));
  });

  it('should read disk cache on --cache-strict NODE_ENV=production', async () => {
    await coffee.fork(helper.npminstall, [ '--cache-strict' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
        NODE_ENV: 'production',
      }),
    })
      .debug()
      .end();
    assert(await fs.stat(path.join(homedir, '.npminstall_tarball/d/e/b/u/debug')));
  });
});
