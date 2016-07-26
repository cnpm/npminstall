'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const installGlobal = require('./npminstall').installGlobal;
const mkdirp = require('../lib/utils').mkdirp;

describe('test/installGlobal.test.js', function() {

  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function* () {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  it('should global install work', function* () {
    yield installGlobal({
      root: tmp,
      targetDir: path.join(tmp, 'lib'),
      binDir: path.join(tmp, 'bin'),
      pkgs: [
        { name: 'contributors' },
        { version: 'https://registry.npm.taobao.org/pedding/download/pedding-1.0.0.tgz' },
        { version: 'https://registry.npm.taobao.org/taffydb/download/taffydb-2.7.2.tgz' },
      ],
    });

    assert(yield fs.exists(path.join(tmp, 'bin/contributors')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/contributors')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/taffydb')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/pedding')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/.contributors_npminstall/node_modules')));
    yield installGlobal({
      root: tmp,
      targetDir: path.join(tmp, 'lib'),
      binDir: path.join(tmp, 'bin'),
      pkgs: [
        { name: 'contributors' },
        { name: 'b' },
      ],
    });

    assert(yield fs.exists(path.join(tmp, 'bin/contributors')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/contributors')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/b')));

    yield installGlobal({
      root: tmp,
      targetDir: path.join(tmp, 'lib'),
      binDir: path.join(tmp, 'bin'),
      pkgs: [
        { name: 'contributors', version: '0' },
      ],
    });

    assert(yield fs.exists(path.join(tmp, 'bin/contributors')));
    assert(yield fs.exists(path.join(tmp, 'lib/node_modules/contributors')));
  });

  it('should install with global prefix', done => {
    coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'pedding',
    ])
    .debug()
    .expect(/All packages installed/)
    .expect('code', 0)
    .end(done);
  });
});
