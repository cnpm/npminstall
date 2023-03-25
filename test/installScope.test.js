const assert = require('node:assert');
const path = require('node:path');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/installScope.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install scope package with version', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: '@rstacruz/tap-spec', version: '4.1.1' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/@rstacruz/tap-spec/package.json'));
    assert(pkg.version === '4.1.1');
  });

  it('should install scope package with version not exist throw err', async () => {
    try {
      await npminstall({
        root: tmp,
        pkgs: [
          { name: '@rstacruz/tap-spec', version: '3.0.0' },
        ],
      });
      throw new Error('should not excute here');
    } catch (err) {
      assert(err.message === '[@rstacruz/tap-spec@3.0.0] Can\'t find package @rstacruz/tap-spec\'s version: 3.0.0');
    }
  });

  it('should install scope package with range', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: '@rstacruz/tap-spec', version: '~4.1.0' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/@rstacruz/tap-spec/package.json'));
    assert(pkg.version === '4.1.1');
  });
});
