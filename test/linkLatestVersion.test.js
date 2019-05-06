'use strict';

const assert = require('assert');
const path = require('path');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/linkLatestVersion.test.js', () => {
  const root = helper.fixtures('link-latest-version');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install latest version to node_modules', async () => {
    await npminstall({
      root,
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules', 'urllib', 'package.json'));
    assert.equal(pkg.version, '2.7.1');

    const pkg2 = await helper.readJSON(path.join(root,
      'node_modules', 'iconv-lite', 'package.json'));
    assert.equal(pkg2.name, 'iconv-lite');
  });
});
