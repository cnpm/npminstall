'use strict';

const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const coffee = require('coffee');
const npminstall = require('./npminstall');

const npminstallBin = path.join(__dirname, '../bin/install.js');

describe.only('test/node-pre-gyp.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should download from http mirror work fine', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'sqlite3', version: '3' },
      ],
      production: true,
      cacheDir: '',
      customBinaryMirrors: {
        sqlite3: {
          host: process.env.CI ? 'https://cnpmjs.org/mirrors' : 'http://cdn.npm.taobao.org/dist',
        },
      },
    });
  });

  it('should install grpc work', () => {
    return coffee.fork(npminstallBin, [ 'grpc' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
  });
});
