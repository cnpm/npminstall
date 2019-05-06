'use strict';

const assert = require('assert');
const path = require('path');
const mkdirp = require('mz-modules/mkdirp');
const fs = require('mz/fs');
const link = require('../lib/link');
const helper = require('./helper');

describe('test/link.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should link same path work', async () => {
    const pkg = {
      name: 'linkfoo',
      version: '1.0.0',
    };
    const parentDir = path.join(tmp, 'parentDir');
    const realDir = path.join(tmp, 'realDir', pkg.name, pkg.version);
    await mkdirp(realDir);
    await link(parentDir, pkg, realDir);
    await link(parentDir, pkg, realDir);
    await link(parentDir, pkg, realDir);
    const linkString = await fs.readlink(path.join(parentDir, 'node_modules', pkg.name));
    if (process.platform === 'win32') {
      assert.equal(linkString, realDir + '\\');
    } else {
      assert.equal(linkString, '../../realDir/linkfoo/1.0.0');
    }
  });
});
