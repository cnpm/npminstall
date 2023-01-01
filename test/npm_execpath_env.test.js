const assert = require('assert');
const path = require('path');
const npminstall = require('./npminstall');
const helper = require('./helper');
const { exists } = require('../lib/utils');

describe('test/npm_execpath_env.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should node-gyp work fine', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'dtrace-provider' },
      ],
    });
    assert(await exists(path.join(tmp, 'node_modules/dtrace-provider')));
  });
});
