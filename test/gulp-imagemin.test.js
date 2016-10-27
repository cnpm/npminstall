'use strict';

const assert = require('power-assert');
const path = require('path');
const rimraf = require('rimraf');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/gulp-imagemin.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'gulp-imagemin');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install local folder ok', function* () {
    yield npminstall({
      root,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules/gulp-imagemin/package.json'));
    assert.equal(pkg.name, 'gulp-imagemin');
  });
});
