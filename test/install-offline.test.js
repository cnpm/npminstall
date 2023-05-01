const path = require('node:path');
const coffee = require('coffee');
const helper = require('./helper');

describe('test/install-offline.test.js', () => {
  // Fixme: mock Windows homedir
  if (process.platform === 'win32') return;

  const [ homedir, cleanupTmp ] = helper.tmp();
  const demo = helper.fixtures('install-offline');
  const cleanupModules = helper.cleanup(demo);

  async function cleanup() {
    await cleanupModules();
    await cleanupTmp();
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install fail when cache manifests not exists', async () => {
    await coffee.fork(helper.npminstall, [ '--offline' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
        npm_config_cache: path.join(homedir, 'foocache/.npminstall_tarball'),
      }),
    })
      .debug()
      .expect('code', 1)
      .expect('stderr', /Can\'t find package .+? manifests on offline mode/)
      .end();
  });

  it('should install success when cache manifests exists', async () => {
    await coffee.fork(helper.npminstall, [ '-d' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
        npm_config_cache: path.join(homedir, 'foocache/.npminstall_tarball'),
      }),
    })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();

    await cleanupModules();
    await coffee.fork(helper.npminstall, [ '-d', '--offline' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
        npm_config_cache: path.join(homedir, 'foocache/.npminstall_tarball'),
      }),
    })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .expect('stdout', /speed 0B\/s, json 0\(0B\), tarball 0B, manifests cache hit \d+, etag hit 0 \/ miss 0/)
      .end();
  });
});
