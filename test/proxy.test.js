'use strict';

const mm = require('mm');
const coffee = require('coffee');
const semver = require('semver');
const proxy = require('./fixtures/reverse-proxy');
const helper = require('./helper');

// proxy tests only work on node < 12
if (semver.satisfies(process.version, '< 12.0.0')) {
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

    const [ cwd, cleanup ] = helper.tmp();

    beforeEach(cleanup);
    afterEach(cleanup);
    afterEach(mm.restore);

    it('should install from proxy', () => {
      return coffee.fork(helper.npminstall, [
        '--proxy', proxyUrl,
        'koa', 'pedding',
      ], { cwd })
        .debug()
        .expect('code', 0)
        .end();
    });
  });
}
