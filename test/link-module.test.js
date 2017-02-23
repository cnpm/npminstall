'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const fs = require('mz/fs');
const npmlink = path.join(__dirname, '../bin/link.js');
const utils = require('../lib/utils');

describe('test/link-module.test.js', () => {
  const root = path.join(__dirname, 'fixtures/link-demo');
  const globalRoot = path.join(__dirname, 'fixtures/link-demo/global');
  const globalTarget = utils.getGlobalInstallMeta(globalRoot).targetDir;
  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(path.join(root, 'global'));
  }

  beforeEach(cleanup);
  // afterEach(cleanup);

  it('should link debug work', function* () {
    yield coffee.fork(npmlink, [ 'debug', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/debug')));
    assert(fs.existsSync(path.join(globalTarget, 'node_modules/debug')));
  });

  it('should link debug@semver work', function* () {
    yield coffee.fork(npmlink, [ 'debug@~2.2.0', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/debug')));
    assert(fs.existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version === '2.2.0');

    yield coffee.fork(npmlink, [ 'debug@1.0.0', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/debug')));
    assert(fs.existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version === '1.0.0');

    yield coffee.fork(npmlink, [ 'debug', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/debug')));
    assert(fs.existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version === '1.0.0');

    yield coffee.fork(npmlink, [ 'debug@latest', `--prefix=${globalRoot}` ], {
      cwd: root,
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/debug')));
    assert(fs.existsSync(path.join(globalTarget, 'node_modules/debug')));
    assert(readJSON(path.join(root, 'node_modules/debug/package.json')).version !== '1.0.0');
  });
});

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p));
}
