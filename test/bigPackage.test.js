/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('../');

describe('test/bigPackage.test.js', () => {
  const names = [
    'spmtest',
    'spmwebpacktest',
  ];
  if (process.platform !== 'win32') {
    names.forEach(name => {
      describe(name, () => {
        const root = path.join(__dirname, 'fixtures', name);

        function cleanup() {
          rimraf.sync(path.join(root, 'node_modules'));
        }

        beforeEach(cleanup);
        afterEach(cleanup);

        it('should install success', function*() {
          yield npminstall({
            root: root,
          });
        });
      });
    });
  }
});
