'use strict';

const assert = require('assert');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const coffee = require('coffee');
const helper = require('./helper');

if (process.platform !== 'win32') {
  describe.skip('test/eslint-plugin-html.test.js', () => {
    const root = helper.fixtures('eslint-plugin-html');
    const cleanup = helper.cleanup(root);

    beforeEach(cleanup);
    // afterEach(cleanup);

    it('should install and run lint pass', async () => {
      await npminstall({
        root,
      });
      const pkg = await readJSON(path.join(root, 'node_modules', 'eslint-plugin-html', 'package.json'));
      assert.equal(pkg.name, 'eslint-plugin-html');
      await runLint(root);
    });
  });
}

function runLint(cwd) {
  return coffee.spawn('npm', [ 'run', 'lint' ], { cwd })
    .debug()
    .expect('code', 0)
    .expect('stdout', /eslint index\.js/)
    .end();
}
