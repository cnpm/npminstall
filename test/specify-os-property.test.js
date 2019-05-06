'use strict';

const assert = require('assert');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/specify-os-property.test.js', () => {
  describe('install fail', () => {
    const wrongPlatform = process.platform === 'darwin' ? 'linux' : 'darwin';
    const root = helper.fixtures(`specify-${wrongPlatform}-os`);
    const cleanup = helper.cleanup(root);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should throw error when package.json#os property not match current platform', async () => {
      try {
        await npminstall({
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
      const root = helper.fixtures(`specify-${process.platform}-os`);
      const cleanup = helper.cleanup(root);

      beforeEach(cleanup);
      afterEach(cleanup);

      it('should success when package.json#os property match current platform', async () => {
        await npminstall({
          root,
        });
      });
    });
  }
});
