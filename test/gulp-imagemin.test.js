const assert = require('assert');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/gulp-imagemin.test.js', () => {
  const root = helper.fixtures('gulp-imagemin');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install local folder ok', async () => {
    await npminstall({
      root,
    });
    const pkg = await readJSON(path.join(root, 'node_modules/gulp-imagemin/package.json'));
    assert.equal(pkg.name, 'gulp-imagemin');
  });
});
