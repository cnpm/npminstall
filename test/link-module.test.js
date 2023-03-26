const assert = require('node:assert');
const path = require('node:path');
const coffee = require('coffee');
const { readFileSync } = require('node:fs');
const utils = require('../lib/utils');
const { rimraf, existsSync } = require('../lib/utils');

const npmlink = path.join(__dirname, '../bin/link.js');

describe('test/link-module.test.js', () => {
  const root = path.join(__dirname, 'fixtures/link-demo-module');
  const globalRoot = path.join(__dirname, 'fixtures/link-demo-module/global');
  const globalTarget = utils.getGlobalInstallMeta(globalRoot).targetDir;
  async function cleanup() {
    await rimraf(path.join(root, 'node_modules'));
    await rimraf(path.join(root, 'global'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should link debug work', async () => {
    await coffee.fork(npmlink, [ 'debug', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
      .debug()
      .end();

    assert(existsSync(path.join(root, 'node_modules/debug')));
    assert(existsSync(path.join(globalTarget, 'node_modules/debug')));
  });

  it('should link debug@semver work', async () => {
    await coffee.fork(npmlink, [ 'debug@~2.2.0', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
      .debug()
      .end();

    assert(existsSync(path.join(root, 'node_modules/debug')));
    assert(existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version === '2.2.0');

    await coffee.fork(npmlink, [ 'debug@1.0.0', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
      .debug()
      .end();

    assert(existsSync(path.join(root, 'node_modules/debug')));
    assert(existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version === '1.0.0');

    await coffee.fork(npmlink, [ 'debug', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
      .debug()
      .end();

    assert(existsSync(path.join(root, 'node_modules/debug')));
    assert(existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version === '1.0.0');

    await coffee.fork(npmlink, [ 'debug@latest', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
      .debug()
      .end();

    assert(existsSync(path.join(root, 'node_modules/debug')));
    assert(existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version !== '1.0.0');
  });
});

function readJSON(p) {
  return JSON.parse(readFileSync(p));
}
