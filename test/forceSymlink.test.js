'use strict';

const assert = require('assert');
const path = require('path');
const mkdirp = require('mz-modules/mkdirp');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/forceSymlink.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should remove exist module first', async () => {
    await mkdirp(path.join(tmp, 'node_modules/debug'));
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'debug', version: '1.0.0' },
      ],
    });
    const pkg = await readJSON(path.join(tmp, 'node_modules/debug/package.json'));
    assert.equal(pkg.name, 'debug');
    assert.equal(pkg.version, '1.0.0');
  });
});
