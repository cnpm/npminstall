const mm = require('mm');
const semver = require('semver');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/node-sass.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);
  afterEach(mm.restore);

  it('should auto set npm_config_cache env', async () => {
    // ignore windows
    if (process.platform === 'win32') return;
    mm(process.env, 'npm_config_cache', undefined);
    let sassVersion = semver.satisfies(process.version, '>= 16.0.0') ? '6' : '4';
    if (semver.satisfies(process.version, '>= 18.0.0')) {
      sassVersion = '8';
    }
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'node-sass', version: sassVersion },
      ],
      env: {
        npm_config_cache: undefined,
      },
    });
  });
});
