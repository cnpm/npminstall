'use strict';

const path = require('path');
const npminstall = path.join(__dirname, '../../packages/npminstall/bin/install.js');
const fixtures = path.join(__dirname, 'fixtures');
const coffee = require('coffee');
const fs = require('fs/promises');
const assert = require('assert');

describe('test/tnpm-prefix.test.js', () => {
  const cwd = path.join(fixtures, 'prefix');
  const packageA = path.join(cwd, 'package-a');
  const packageB = path.join(cwd, 'package-b');

  afterEach(async () => {
    await fs.rm(path.join(packageA, 'node_modules'), { recursive: true });
  });
  it.skip('should use npm', async () => {
    await coffee
      .fork(npminstall, [ `--prefix=${packageA}` ], { cwd: packageB })
      .debug()
      .expect('code', 0)
      .end();

    assert.strictEqual(require(path.join(packageA, 'node_modules/lodash.has/package.json')).version, '4.5.2');
  });
});
