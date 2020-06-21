'use strict';

const assert = require('assert');
const rimraf = require('mz-modules/rimraf');
const path = require('path');
const fs = require('fs');
const coffee = require('coffee');
const semver = require('semver');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/postinstall.test.js', () => {
  describe('postinstall', () => {
    const root = helper.fixtures('postinstall');
    const cleanup = helper.cleanup(root);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should run preinstall, install, postinstall and prepublish', async () => {
      await coffee.fork(helper.npminstall, [], { cwd: root })
        .debug()
        .expect('code', 0)
        .end();
      const pkg = await readJSON(path.join(root, 'node_modules', 'utility', 'package.json'));
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
      // prepare pass
      assert.equal(fs.readFileSync(path.join(root, 'node_modules', '.prepare.txt'), 'utf8'), 'success: prepare');
    });

    it('should not run prepublish with production mode', async () => {
      await npminstall({
        root,
        production: true,
      });
      const pkg = await readJSON(path.join(root, 'node_modules', 'utility', 'package.json'));
      assert.equal(pkg.name, 'utility');
      assert.equal(pkg.version, '1.6.0');

      // postinstall pass
      assert.equal(fs.readFileSync(path.join(root, 'node_modules', '.postinstall.txt'), 'utf8'), 'success: postinstall');

      // prepublish pass
      let hasFile = false;
      try {
        hasFile = !!fs.statSync(path.join(root, 'node_modules', '.prepublish.txt'));
      } catch (err) {
        // empty
      }
      assert.equal(hasFile, false);
    });
  });

  if (semver.satisfies(process.version, '< 13.0.0')) {
    describe('node-gyp', () => {
      const root = helper.fixtures('node-gyp-hello');

      async function cleanup() {
        await rimraf(path.join(root, 'build'));
        await rimraf(path.join(root, 'node_modules'));
      }

      beforeEach(cleanup);
      afterEach(cleanup);

      it('should auto run node-gyp rebuild', async () => {
        await npminstall({
          root,
        });
      });
    });

    if (process.platform !== 'win32') {
      describe('test/installSaveDeps.test.js', () => {
        const root = helper.fixtures('auto-set-npm-env');
        const cleanup = helper.cleanup(root);

        beforeEach(cleanup);
        afterEach(cleanup);

        it('should install --save pedding and update dependencies', async () => {
          await coffee.fork(helper.npminstall, [
            '--foo_bar_haha=okok',
            '-d',
          ], {
            cwd: root,
          })
            .debug()
            .expect('stdout', /pedding@1\.0\.0 installed/)
            .expect('stdout', /npm_config_foo_bar_haha = okok/)
            .expect('code', 0)
            .end();

          const pkg = await readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
          assert(pkg.version === '1.0.0');
        });
      });
    }
  }
});
