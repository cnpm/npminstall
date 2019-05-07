'use strict';

const fs = require('fs');
const assert = require('assert');
const mm = require('mm');
const path = require('path');

const initialCnpmrc = path.join(__dirname, './fixtures/initial-cnpmrc/')

// clean cnpm_config.js cache
delete require.cache[require.resolve('../lib/get')];
delete require.cache[require.resolve('../lib/cnpm_config')];

mm.restore();

mm(process.env, 'HOME', initialCnpmrc);
mm(process.env, 'USERPROFILE', initialCnpmrc);

const get = require('../lib/get');

describe('test/get.test.js', () => {
  it('should run get function successfully without cnpmrc user config', function* () {
    const options = { dataType: 'json' };
    try {
      yield get('https://registry.npmjs.com/', options);
    } catch (err) {
      assert(!/TypeError/.test(err.name), err.name)
    }
  });
});
