'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe('test/tarball-url-mapping.test.js', () => {
  const [ cwd, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should replace tarball url to other', async () => {
    await coffee.fork(helper.npminstall, [
      'pedding',
      '--tarball-url-mapping=' + JSON.stringify({
        'https://cdn.npm.taobao.org': 'https://tnpm-hz.oss-cn-hangzhou.aliyuncs.com',
        'https://registry.npmjs.com': 'https://registry.npmjs.org',
      }),
      '-d',
      '--no-cache',
    ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /pedding@\* installed/)
      .end();
  });
});
