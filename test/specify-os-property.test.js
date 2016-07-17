'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');

describe('test/specify-os-property.test.js', () => {
  describe('install fail', () => {
    const wrongPlatform = process.platform === 'darwin' ? 'linux' : 'darwin';
    const root = path.join(__dirname, 'fixtures', `specify-${wrongPlatform}-os`);

    function cleanup() {
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should throw error when package.json#os property not match current platform', function* () {
      try {
        yield npminstall({
          root,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/not compatible with your platform/.test(err.message), err.message);
      }
    });
  });

  if (process.platform === 'darwin' || process.platform === 'linux') {
    describe('install success', () => {
      const root = path.join(__dirname, 'fixtures', `specify-${process.platform}-os`);

      function cleanup() {
        rimraf.sync(path.join(root, 'node_modules'));
      }

      beforeEach(cleanup);
      afterEach(cleanup);

      it('should success when package.json#os property match current platform', function* () {
        yield npminstall({
          root,
        });
      });
    });
  }
});
