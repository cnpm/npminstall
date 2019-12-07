'use strict';

const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const mm = require('mm');
const coffee = require('coffee');
const semver = require('semver');

if (semver.satisfies(process.version, '>= 6.0.0')) {
  const proxy = require('./fixtures/reverse-proxy');
  const npminstallBin = path.join(__dirname, '../bin/install.js');

  describe('test/proxy.test.js', () => {
    let port;
    let proxyUrl;
    before(done => {
      proxy.listen(0, () => {
        port = proxy.address().port;
        proxyUrl = 'http://127.0.0.1:' + port;
        console.log('proxy: %s', proxyUrl);
        done();
      });
    });
    after(() => proxy.close());

    const tmp = path.join(__dirname, 'fixtures', 'tmp');

    function cleanup() {
      rimraf.sync(tmp);
    }

    beforeEach(() => {
      cleanup();
      mkdirp.sync(tmp);
    });
    afterEach(cleanup);
    afterEach(mm.restore);

    it('should install from proxy', () => {
      return coffee.fork(npminstallBin, [
        '--proxy', proxyUrl,
        'koa', 'pedding',
      ], {
        cwd: tmp,
      })
        .debug()
        .expect('code', 0)
        .end();
    });
  });
}
