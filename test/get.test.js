const fs = require('fs');
const assert = require('assert');
const path = require('path');
const assertFile = require('assert-file');
const mm = require('mm');

const mockCnpmrc = path.join(__dirname, './fixtures/auth/');
if (!fs.existsSync(path.join(mockCnpmrc, '.cnpmrc'))) {
  fs.writeFileSync(path.join(mockCnpmrc, '.cnpmrc'), 'registry=https://registry-mock.org/\n//registry-mock.org/:always-auth=true\n//registry-mock.org/:_password="bW9jaw=="\n//registry-mock.org/:username=hyj19911120');
}
mm(process.env, 'HOME', mockCnpmrc);
mm(process.env, 'USERPROFILE', mockCnpmrc);
// clean cnpm_config.js cache
delete require.cache[require.resolve('../lib/get')];
delete require.cache[require.resolve('../lib/cnpm_config')];
const get = require('../lib/get');
mm.restore();

describe('test/get.test.js', () => {
  it('should retry on JSON parse error', async () => {
    const logger = {
      warn(msg) {
        assert(msg.includes('[npminstall:get] retry GET') || msg.includes('[npminstall:get:error] GET'));
      },
    };
    try {
      await get('https://cnpmjs.org', { dataType: 'json' }, { console: logger });
      assert(false, 'should not run this');
    } catch (err) {
      assert.equal(err.name, 'JSONResponseFormatError');
      assert(err.res.requestUrls.length > 0);
    }
  });

  it('should set auth info into header', async () => {
    const logger = {
      warn(msg) {
        assert(msg.includes('[npminstall:get] retry GET') || msg.includes('[npminstall:get:error] GET'));
      },
    };
    const options = { dataType: 'json' };
    assertFile(path.join(mockCnpmrc, '.cnpmrc'));
    try {
      await get('https://registry-mock.org/mock', options, { console: logger });
      assert(false, 'should not run this');
    } catch (err) {
      console.error(err);
      const headers = options.headers;
      assert(headers.Authorization);
      assert(err.message.includes('ENOTFOUND') || err.message.includes('Connect Timeout Error'));
      assert(err.res.requestUrls.length > 0);
    }
  });
});
