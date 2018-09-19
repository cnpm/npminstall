'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const fs = require('fs');
const assert = require('assert');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/install-vscode.test.js', () => {
  const cwd = path.join(__dirname, 'fixtures', 'install-vscode');

  function cleanup() {
    rimraf.sync(path.join(cwd, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install vscode version on dependencies', function* () {
    yield coffee.fork(npminstall, [ '-c', '-d' ], { cwd, env: { NPMINSTALL_TEST_LOCAL_PKG: '1' } })
      .debug()
      .expect('code', 0)
      .expect('stdout', /download from mirrors: {/)
      .end();
    const installFile = path.join(cwd, 'node_modules/vscode/bin/install');
    const content = fs.readFileSync(installFile, 'utf8');
    assert(!content.includes('https://raw.githubusercontent.com/'));
  });
});
