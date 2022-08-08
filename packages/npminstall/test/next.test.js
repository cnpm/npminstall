'use strict';

const path = require('path');
const assert = require('assert');
const helper = require('./helper');
const npminstall = require('./npminstall');
const { exists, exec } = require('../lib/utils');

// make sure https://github.com/cnpm/cnpm/issues/194 work!
describe.skip('test/next.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should next build success', async () => {
    await exec(`git clone --depth=1 git://github.com/now-examples/next-news.git ${tmp}`);
    await npminstall({
      root: tmp,
    });
    await exec('npm run build', {
      cwd: tmp,
    });
    assert(await exists(path.join(tmp, '.next')));
  });
});
