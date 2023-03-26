const assert = require('node:assert');
const path = require('node:path');
const coffee = require('coffee');
const helper = require('./helper');
const { exists } = require('../lib/utils');

describe('test/install-save-bin-name.test.js', () => {
  const root = helper.fixtures('same-bin-name');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install work', async () => {
    await coffee.fork(helper.npminstall, [ 'webpack-parallel-uglify-plugin@1.0.0' ], {
      cwd: root,
    })
      .debug()
      .expect('code', 0)
      .end();

    assert(await exists(path.join(root, 'node_modules/webpack-parallel-uglify-plugin/node_modules/.bin/uglifyjs')));
  });
});
