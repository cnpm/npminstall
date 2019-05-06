'use strict';

const fs = require('mz/fs');
const assert = require('assert');
const path = require('path');
const mm = require('mm');
const semver = require('semver');
const npminstall = require('./npminstall');
const helper = require('./helper');

if (process.platform !== 'win32' && semver.satisfies(process.version, '< 12.0.0')) {
  describe('test/node-gyp.test.js', () => {
    const [ tmp, cleanup ] = helper.tmp();

    beforeEach(cleanup);
    afterEach(cleanup);
    afterEach(mm.restore);

    it('should node-gyp work fine', async () => {
      // remove npm's node-gyp path
      mm(process.env, 'PATH', process.env.PATH.replace('node-gyp-bin', ''));
      try {
        await npminstall({
          root: tmp,
          pkgs: [
            { name: 'node-icu-charset-detector', version: '0.2.0' },
          ],
        });
      } catch (err) {
        // ignore
      }
      assert(await fs.exists(path.join(tmp, 'node_modules/node-icu-charset-detector/build')));
    });
  });
}
