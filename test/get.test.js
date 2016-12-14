'use strict';

const assert = require('power-assert');
const get = require('../lib/get');

describe('test/get.test.js', () => {
  it('should retry on JSON parse error', function* () {
    const logger = {
      warn(msg) {
        assert(msg.indexOf('[npminstall:get] retry GET') === 0);
      },
    };
    try {
      yield get('https://cnpmjs.org', { dataType: 'json' }, { console: logger });
      assert(false, 'should not run this');
    } catch (err) {
      assert(err.name === 'JSONResponseFormatError');
      assert(err.res.requestUrls.length === 5);
    }
  });
});
