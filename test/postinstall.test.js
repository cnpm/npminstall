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
const fs = require('fs');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('..');

describe.only('test/postinstall.test.js', () => {

  describe('postinstall', function() {
    const root = path.join(__dirname, 'fixtures', 'postinstall');

    function cleanup() {
      rimraf.sync(path.join(root, '.npminstall'));
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should run preinstall, install and postinstall', function*() {
      yield npminstall({
        root: root,
      });
      const pkg = yield readJSON(path.join(root, 'node_modules', 'utility', 'package.json'));
      assert.equal(pkg.name, 'utility');
      assert.equal(pkg.version, '1.6.0');

      // preinstall pass
      assert.equal(fs.readFileSync(path.join(root, '.preinstall.txt'), 'utf8'), 'success: preinstall');
      // install pass
      assert.equal(fs.readFileSync(path.join(root, 'node_modules', '.install.txt'), 'utf8'), 'success: install');
      // postinstall pass
      assert.equal(fs.readFileSync(path.join(root, 'node_modules', '.postinstall.txt'), 'utf8'), 'success: postinstall');
    });
  });

  describe('node-gyp', function() {
    const root = path.join(__dirname, 'fixtures', 'node-gyp-hello');

    function cleanup() {
      rimraf.sync(path.join(root, 'build'));
      rimraf.sync(path.join(root, '.npminstall'));
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should auto run node-gyp rebuild', function*() {
      yield npminstall({
        root: root,
      });
    });
  });
});
