const assert = require('node:assert');
const npminstall = require('./npminstall');
const helper = require('./helper');
const { exists } = require('../lib/utils');

describe('test/css-loader.test.js', () => {
  const tmp = helper.fixtures('css-loader-example2');
  it('should work on css-loader', async () => {
    // ignore windows
    if (process.platform === 'win32') return;
    await npminstall({
      root: tmp,
      registry: 'https://registry.npmjs.com',
      env: {
        NODE_OPTIONS: '--max_old_space_size=4096',
      },
    });
    assert(await exists(tmp, 'node_modules/css-loader'));
  });
});
