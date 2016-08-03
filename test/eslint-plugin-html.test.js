'use strict';

const assert = require('power-assert');
const rimraf = require('rimraf');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const coffee = require('coffee');

if (process.platform !== 'win32') {
  describe('test/eslint-plugin-html.test.js', () => {
    const root = path.join(__dirname, 'fixtures', 'eslint-plugin-html');

    function cleanup() {
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install and run lint pass', function* () {
      yield npminstall({
        root,
      });
      const pkg = yield readJSON(path.join(root, 'node_modules', 'eslint-plugin-html', 'package.json'));
      assert.equal(pkg.name, 'eslint-plugin-html');
      yield runLint(root);
    });
  });
}

function runLint(cwd) {
  return callback => {
    coffee.spawn('npm', [ 'run', 'lint' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /eslint index\.js/)
      .end(callback);
  };
}
