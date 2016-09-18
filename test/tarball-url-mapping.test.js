'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');

describe('tarball-url-mapping.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');
  const bin = path.join(__dirname, '../bin/install.js');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should replace tarball url to other', done => {
    coffee.fork(bin, [
      'pedding',
      '--tarball-url-mapping=' + JSON.stringify({
        'https://cdn.npm.taobao.org': 'https://tnpm-hz.oss-cn-hangzhou.aliyuncs.com',
        'https://registry.npmjs.com': 'https://registry.npmjs.org',
      }),
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /\[pedding@\*\] installed/)
      .end(done);
  });
});
