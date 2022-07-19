'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const coffee = require('coffee');
const helper = require('./helper');

if (process.platform !== 'win32') {
  describe('test/fmode.test.js', () => {
    const [ homedir, cleanup ] = helper.tmp();

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should fix file mode success', async () => {
      await coffee.fork(helper.npminstall, [ 'array-unique@0.2.1' ], {
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
