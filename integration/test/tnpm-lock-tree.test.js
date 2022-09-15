'use strict';

const coffee = require('coffee');
const path = require('path');
const mm = require('mm');
const runscript = require('runscript');
const npminstall = path.join(__dirname, '../../packages/npminstall/bin/install.js');
const fixtures = path.join(__dirname, './fixtures');


describe('test/tnpm-lock-tree.test.js', () => {
  const cwd = path.join(fixtures, 'lock-tree');
  beforeEach(async () => {
    mm(process.env, 'TNPM_FORCE_RAPID_FALLBACK', 'true');
    await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
  });

  afterEach(async () => {
    mm.restore();
    await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
    await runscript(`rm -f ${path.join(cwd, 'package-lock.json.bak')}`);
  });

  it('should success', async () => {
    await coffee.fork(npminstall, [
      '--by=rapid',
      `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`,
    ], {
      cwd,
      stdio: 'pipe',
    })
      .debug()
      .expect('code', 0)
      .expect('stdout', /added 2903 packages/);
  });
});
