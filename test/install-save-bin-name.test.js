'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');

describe.only('test/install-save-bin-name.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'same-bin-name');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  // afterEach(cleanup);

  it('should install work', function* () {
    yield coffee.fork(npminstall, [ 'webpack-parallel-uglify-plugin@1.0.0' ], {
      cwd: root,
    })
    .debug()
    .expect('code', 0)
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/.bin/uglifyjs')));
  });
});
