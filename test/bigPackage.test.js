'use strict';

const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');

describe('test/bigPackage.test.js', () => {
  function testcase(name) {
    describe(name, () => {
      const root = path.join(__dirname, 'fixtures', name);

      function cleanup() {
        rimraf.sync(path.join(root, 'node_modules'));
      }

      beforeEach(cleanup);
      afterEach(cleanup);

      it('should install success', function* () {
        yield npminstall({
          root,
        });
      });
    });
  }

  if (process.platform !== 'win32') {
    [
      'spmtest',
      'spmwebpacktest',
    ].forEach(testcase);
  }

  [
    'standardtest',
  ].forEach(testcase);
});
