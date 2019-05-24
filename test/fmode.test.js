'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');

if (process.platform !== 'win32') {
  describe('test/fmode.test.js', () => {
    const homedir = path.join(__dirname, 'fixtures', '.tmp');

    function cleanup() {
      rimraf.sync(homedir);
    }

    beforeEach(() => {
      cleanup();
      fs.mkdirSync(homedir);
    });
    afterEach(cleanup);

    it('should fix file mode success', function* () {
      yield coffee.fork(npminstall, [ 'array-unique@0.2.1' ], {
        cwd: homedir,
      })
        .debug()
        .end();
      const stat = fs.statSync(path.join(homedir, 'node_modules/array-unique/index.js'));
      // 700 -> 744
      assert(stat.mode === 33252);
    });
  });
}
