'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs');
const coffee = require('coffee');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('..');

describe('test/postinstall.test.js', () => {

  describe('postinstall', function() {
    const root = path.join(__dirname, 'fixtures', 'postinstall');

    function cleanup() {
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should run preinstall, install, postinstall and prepublish', function* () {
      yield npminstall({
        root,
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
      // prepublish pass
      assert.equal(fs.readFileSync(path.join(root, 'node_modules', '.prepublish.txt'), 'utf8'), 'success: prepublish');
    });
  });

  describe('node-gyp', function() {
    const root = path.join(__dirname, 'fixtures', 'node-gyp-hello');

    function cleanup() {
      rimraf.sync(path.join(root, 'build'));
      rimraf.sync(path.join(root, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should auto run node-gyp rebuild', function* () {
      yield npminstall({
        root,
      });
    });
  });

  if (process.platform !== 'win32') {
    describe('test/installSaveDeps.test.js', () => {
      const root = path.join(__dirname, 'fixtures', 'auto-set-npm-env');

      beforeEach(() => {
        rimraf.sync(path.join(root, 'node_modules'));
      });
      afterEach(() => {
        rimraf.sync(path.join(root, 'node_modules'));
      });

      it('should install --save pedding and update dependencies', done => {
        coffee.fork(path.join(__dirname, '..', 'bin', 'install.js'), [
          '--foo_bar_haha=okok',
        ], {
          cwd: root,
        })
        .debug()
        .expect('stdout', /\[pedding@1\.0\.0] installed/)
        .expect('stdout', /npm_config_foo_bar_haha = okok/)
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);
          const version = require(path.join(root, 'node_modules', 'pedding', 'package.json')).version;
          assert(version);
          assert.equal(version, '1.0.0');
          done();
        });
      });
    });
  }
});
