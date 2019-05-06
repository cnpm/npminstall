'use strict';

const assert = require('assert');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/runscript.test.js', () => {
  const root = helper.fixtures('runscript');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should run preinstall and postinstall', async () => {
    await npminstall({
      root,
    });
    const pkg = await readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert(pkg.name === 'pedding');
  });
});
