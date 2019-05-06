'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const coffee = require('coffee');
const helper = require('./helper');

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

    assert(await fs.exists(path.join(root, 'node_modules/webpack-parallel-uglify-plugin/node_modules/.bin/uglifyjs')));
  });
});
