'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const mm = require('mm');
const npminstall = require('./npminstall');

if (process.platform !== 'win32') {
  describe('test/node-gyp.test.js', () => {
    const tmp = path.join(__dirname, 'fixtures', 'tmp');

    function cleanup() {
      rimraf.sync(tmp);
    }

    beforeEach(() => {
      cleanup();
      mkdirp.sync(tmp);
    });
    afterEach(cleanup);
    afterEach(mm.restore);

    it('should node-gyp work fine', function* () {
      // remove npm's node-gyp path
      mm(process.env, 'PATH', process.env.PATH.replace('node-gyp-bin', ''));
      try {
        yield npminstall({
          root: tmp,
          pkgs: [
            { name: 'node-icu-charset-detector', version: '0.2.0' },
          ],
        });
      } catch (err) {
        // ignore
      }
      assert(fs.existsSync(path.join(tmp, 'node_modules/node-icu-charset-detector/build')));
    });
  });
}
