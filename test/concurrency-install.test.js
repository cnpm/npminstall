'use strict';

const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');

describe('test/concurrency-install.test.js', () => {
  const root1 = path.join(__dirname, 'fixtures', 'concurrency1');
  const root2 = path.join(__dirname, 'fixtures', 'concurrency2');
  const cacheDir = path.join(__dirname, 'fixtures', '.tmp');

  function cleanup() {
    rimraf.sync(cacheDir);
    rimraf.sync(path.join(root1, 'node_modules'));
    rimraf.sync(path.join(root2, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should concurrency install success', function* () {
    yield [
      npminstall({
        root: root1,
        cacheDir,
        detail: true,
      }),
      npminstall({
        root: root2,
        cacheDir,
        detail: true,
      }),
    ];
  });
});
