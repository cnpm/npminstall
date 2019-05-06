'use strict';

const fs = require('mz/fs');
const path = require('path');
const assert = require('assert');
const exec = require('mz/child_process').exec;
const helper = require('./helper');
const npminstall = require('./npminstall');

// make sure https://github.com/cnpm/cnpm/issues/194 work!
describe.skip('test/next.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should next build success', async () => {
    await exec(`git clone https://github.com/now-examples/next-news.git ${tmp}`);
    await npminstall({
      root: tmp,
    });
    await exec('npm run build', {
      cwd: tmp,
    });
    assert(await fs.exists(path.join(tmp, '.next')));
  });
});
