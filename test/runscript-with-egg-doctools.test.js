'use strict';

const assert = require('assert');
const path = require('path');
const { execaCommand } = await import('execa');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/runscript-with-egg-doctools.test.js', () => {
  const root = helper.fixtures('runscript-with-egg-doctools');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should runscript with egg-doctools bin', async () => {
    await npminstall({
      root,
    });
    const pkg = await readJSON(path.join(root, 'node_modules', 'egg-doctools', 'package.json'));
    assert(pkg.name === 'egg-doctools');

    const bin = path.join(root, 'node_modules', '.bin', 'doctools');
    const stdio = await execaCommand(`${bin} -V`, { stdio: 'pipe' });
    assert(stdio.stdout.toString().trim() === '2.9.0');
  });
});
