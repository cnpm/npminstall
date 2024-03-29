const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const coffee = require('coffee');
const { rimraf, readJSON, fastSemverSatisfies } = require('../lib/utils');
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
        // should run deps scripts on background by default
        .notExpect('stdout', /run on postinstall-hello/)
        .notExpect('stdout', /postinstall-hello@1.0.0 postinstall/)
        .expect('stdout', /node index.js preinstall/)
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

    it('should run preinstall, install, postinstall and prepublish --foreground-scripts', async () => {
      await coffee.fork(helper.npminstall, [ '--foreground-scripts' ], { cwd: root })
        .debug()
        .expect('code', 0)
        // should run deps scripts on foreground
        .expect('stdout', /run on postinstall-hello/)
        .expect('stdout', /postinstall-hello@1.0.0 postinstall/)
        .expect('stdout', /node index.js preinstall/)
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
  });

  if (fastSemverSatisfies(process.version, '< 13.0.0')) {
    describe('node-gyp', () => {
      const root = helper.fixtures('node-gyp-hello');

      async function cleanup() {
        await rimraf(path.join(root, 'build'));
        await rimraf(path.join(root, 'node_modules'));
      }

      beforeEach(cleanup);
      afterEach(cleanup);

      it('should auto run node-gyp rebuild', async () => {
        // ingore windows
        if (process.platform === 'win32') return;
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
