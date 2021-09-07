'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/css-loader.test.js', () => {
  const tmp = helper.fixtures('css-loader-example2');
  const cleanup = helper.cleanup(tmp);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should work on css-loader', async () => {
    await npminstall({
      root: tmp,
      registry: 'https://registry.npmjs.com',
    });
    assert(await fs.exists(tmp, 'node_modules/css-loader'));
  });
});
