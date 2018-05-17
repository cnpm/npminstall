'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');
const exec = require('mz/child_process').exec;

// make sure https://github.com/cnpm/cnpm/issues/194 work!
describe.skip('test/next.test.js', () => {
  const tmp = path.join(__dirname, '.tmp', 'next');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should next build success', function* () {
    yield exec(`git clone https://github.com/now-examples/next-news.git ${tmp}`);
    yield npminstall({
      root: tmp,
    });
    yield exec('npm run build', {
      cwd: tmp,
    });
    assert(fs.existsSync(path.join(tmp, '.next')));
  });
});
