'use strict';

const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

// make sure https://github.com/cnpm/npminstall/pull/223 work!
describe('test/css-loader.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'css-loader-example2');

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should work on css-loader', function* () {
    yield npminstall({
      root: tmp,
    });
  });
});
