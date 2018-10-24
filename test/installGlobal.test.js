'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const mkdirp = require('../lib/utils').mkdirp;

describe('test/installGlobal.test.js', () => {
  const registry = process.env.npm_registry || 'https://r.cnpmjs.org';
  const tmp = path.join(__dirname, 'fixtures', 'tmp');
  let binDir = path.join(tmp, 'bin');
  let libDir = path.join(tmp, 'lib');
  if (process.platform === 'win32') {
    binDir = tmp;
    libDir = tmp;
  }

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function* () {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  it('should global install work', function* () {
    yield coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'contributors',
      `${registry}/pedding/-/pedding-1.0.0.tgz`,
      `${registry}/taffydb/-/taffydb-2.7.2.tgz`,
      `${registry}/egg-bin/-/egg-bin-1.6.0.tgz`,
    ])
    .debug()
    .expect('stdout', /All packages installed/)
    .expect('code', 0)
    .end();

    assert(yield fs.exists(path.join(binDir, 'contributors')));
    assert(yield fs.exists(path.join(binDir, 'egg-bin')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/contributors')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/taffydb')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/pedding')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/egg-bin')));
    assert(!(yield fs.exists(path.join(libDir, 'node_modules/.contributors_npminstall/node_modules'))));

    yield coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'contributors',
      'b',
      `${registry}/egg-bin/-/egg-bin-1.7.0.tgz`,
    ])
    .debug()
    .expect('stdout', /All packages installed/)
    .expect('code', 0)
    .end();

    assert(yield fs.exists(path.join(binDir, 'contributors')));
    assert(yield fs.exists(path.join(binDir, 'egg-bin')));
    assert(yield fs.exists(path.join(binDir, 'mocha')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/contributors')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/b')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/egg-bin')));

    yield coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'contributors@0',
    ])
    .debug()
    .expect('stdout', /All packages installed/)
    .expect('code', 0)
    .end();

    assert(yield fs.exists(path.join(binDir, 'contributors')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/contributors')));
  });

  it('should install with global prefix', function* () {
    yield coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'egg-bin',
    ])
    .debug()
    .expect('stdout', /Downloading egg-bin to /)
    .expect('stdout', /Installing egg-bin's dependencies to /)
    .expect('stdout', /All packages installed/)
    .expect('code', 0)
    .end();

    assert(yield fs.exists(path.join(binDir, 'egg-bin')));
    assert(yield fs.exists(path.join(binDir, 'mocha')));
    assert(yield fs.exists(path.join(libDir, 'node_modules/egg-bin')));
    assert((yield fs.stat(path.join(libDir, 'node_modules/egg-bin'))).isDirectory());
  });
});
