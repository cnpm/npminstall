'use strict';

const assert = require('assert');
const path = require('path');
const runScript = require('runscript');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe.only('test/runscript-with-mocha.test.js', () => {
  const root = helper.fixtures('runscript-with-mocha');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should runscript with mocha.cmd', async () => {
    await npminstall({
      root,
    });
    const pkg = await readJSON(path.join(root, 'node_modules', 'mocha', 'package.json'));
    assert(pkg.name === 'mocha');

    let mochaBin = path.join(root, 'node_modules', '.bin', 'mocha');
    if (process.platform === 'win32') {
      mochaBin = `${mochaBin}.cmd`;
    }
    const stdio = await runScript(`${mochaBin} -V`, { stdio: 'pipe' });
    assert(stdio.stdout.toString().trim() === '3.5.3');
  });
});
