'use strict';

const mm = require('mm');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/node-sass.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);
  afterEach(mm.restore);

  it('should auto set npm_config_cache env', async () => {
    mm(process.env, 'npm_config_cache', undefined);
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'node-sass', version: '4' },
      ],
      env: {
        npm_config_cache: undefined,
      },
    });
  });
});
