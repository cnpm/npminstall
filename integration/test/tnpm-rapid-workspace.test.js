'use strict';

const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const runscript = require('runscript');
const npminstall = path.join(__dirname, '../../packages/npminstall/bin/install.js');
const clean = require('../../packages/npminstall/lib/clean');
const assert = require('assert');

describe('test/tnpm-rapid-workspace.test.js', () => {
  let cwd;

  afterEach(async () => {
    await clean(cwd);
  });

  it('should install lodash succeed', async () => {
    cwd = path.join(__dirname, './fixtures/workspace');
    await runscript(`node ${npminstall} --fs=rapid`, { cwd });

    assert(fs.existsSync(path.join(cwd, 'node_modules/lodash/package.json')));
    assert(!fs.existsSync(path.join(cwd, 'packages/lodash-1/node_modules/lodash/package.json')));
    assert(fs.existsSync(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    const lodash1 = JSON.parse(await fsPromise.readFile(path.join(cwd, 'node_modules/lodash/package.json')));
    const lodash2 = JSON.parse(await fsPromise.readFile(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    assert(lodash1.version.startsWith('1.'));
    assert(lodash2.version.startsWith('2.'));
  });
});
