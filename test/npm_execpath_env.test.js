'use strict';

const fs = require('mz/fs');
const assert = require('assert');
const path = require('path');
const npminstall = require('./npminstall');
const helper = require('./helper');

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
    assert(await fs.exists(path.join(tmp, 'node_modules/dtrace-provider')));
  });
});
