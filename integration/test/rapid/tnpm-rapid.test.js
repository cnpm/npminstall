'use strict';

const coffee = require('coffee');
const fs = require('fs');
const path = require('path');
const npminstall = path.join(__dirname, '../../../packages/npminstall/bin/install.js');
const clean = require('npminstall/lib/clean');
const runscript = require('runscript');
const assert = require('assert');

describe('test/tnpm-rapid.test.js', () => {
  let cwd;

  afterEach(async () => {
    await clean(cwd);
  });

  it('should install lodash succeed', async () => {
    cwd = path.join(__dirname, './fixtures/rapid-lodash-test');
    await coffee
      .fork(npminstall, [ '--fs=rapid' ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    assert(fs.existsSync(path.join(cwd, 'node_modules/lodash/package.json')));
    const { stdout } = await runscript('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(path.join(cwd)) > 0);
  });
});
