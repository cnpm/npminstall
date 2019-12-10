'use strict';

const path = require('path');
const rimraf = require('rimraf');
const semver = require('semver');
const npminstall = require('./npminstall');

if (semver.satisfies(process.version, '>= 6.0.0')) {
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
            trace: true,
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
}
