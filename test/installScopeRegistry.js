'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const mm = require('mm');
const helper = require('./helper');
const mockCnpmrc = path.join(__dirname, './fixtures/scope/');
if (!fs.existsSync(mockCnpmrc + '.cnpmrc')) {
  fs.writeFileSync(mockCnpmrc + '.cnpmrc', '@starthubit:registry=https://registry-mock.org/\n@rstacruz:registry=https://mirrors.huaweicloud.com/repository/npm/\n');
}
mm(process.env, 'HOME', mockCnpmrc);
mm(process.env, 'USERPROFILE', mockCnpmrc);
// clean cnpm_config.js cache
delete require.cache[require.resolve('../lib/cnpm_config')];
delete require.cache[require.resolve('../lib/get')];
delete require.cache[require.resolve('./npminstall')];
const npminstall = require('./npminstall');
mm.restore();

describe('test/installScope.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install scope package with huawei available scope registry', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: '@rstacruz/tap-spec', version: '~4.1.0' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/@rstacruz/tap-spec/package.json'));
    assert(pkg.version === '4.1.1');
  });

  it('should install scope package with unavailable scope registry', async () => {
    try {
      await npminstall({
        root: tmp,
        pkgs: [
          { name: '@starthubit/npm-test-pkg', version: '~0.0.2' },
        ],
      });
    } catch (err) {
      assert(err.name === 'RequestError');
      assert(err.res.requestUrls[0] === 'https://registry-mock.org/@starthubit%2Fnpm-test-pkg');
    }

  });

});
