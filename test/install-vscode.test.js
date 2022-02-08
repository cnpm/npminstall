'use strict';

const path = require('path');
const coffee = require('coffee');
const fs = require('mz/fs');
const assert = require('assert');
const helper = require('./helper');

describe('test/install-vscode.test.js', () => {
  const cwd = helper.fixtures('install-vscode');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install vscode version on dependencies', async () => {
    await coffee.fork(helper.npminstall, [ '-c', '-d' ], { cwd, env: { NPMINSTALL_TEST_LOCAL_PKG: '1' } })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    const installFile = path.join(cwd, 'node_modules/vscode/bin/install');
    const content = await fs.readFile(installFile, 'utf8');
    assert(content.includes('process.env.npm_package_engines_vscode'));
  });
});
