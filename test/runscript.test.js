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

const assert = require('assert');
const rimraf = require('rimraf');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('..');

describe('test/runscript.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'runscript');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should run preinstall and postinstall', function*() {
    yield npminstall({
      root: root,
    });
    const pkg = yield readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
    assert.equal(pkg.name, 'pedding');
  });
});
