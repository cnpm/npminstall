'use strict';

const coffee = require('coffee');
const path = require('path');
const mm = require('mm');
const assert = require('assert');
const fs = require('fs/promises');
const runscript = require('runscript');
const npminstall = path.join(__dirname, '../../packages/npminstall/bin/install.js');
const fixtures = path.join(__dirname, './fixtures');


describe('test/tnpm-rapid-fallback.test.js', () => {
  const cwd = path.join(fixtures, 'tnpm-install-rapid-force-fallback');
  const pkglockPath = path.join(cwd, 'package-lock.json');
  beforeEach(async () => {
    await runscript(`rm -f ${pkglockPath}`);
    await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
    await runscript(`rm -f ${path.join(cwd, 'package-lock.json.bak')}`);
  });

  afterEach(async () => {
    mm.restore();
    await runscript(`rm -f ${pkglockPath}`);
    await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
    await runscript(`rm -f ${path.join(cwd, 'package-lock.json.bak')}`);
    await runscript(`rm -rf ${process.cwd()}/tnpmci*`);
  });

  it('should success', done => {
    coffee.fork(npminstall, [
      '--by=rapid',
    ], {
      cwd,
      stdio: 'pipe',
      env: {
        TNPM_FORCE_RAPID_FALLBACK: true,
      },
    })
      .debug()
      .expect('stdout', /added 1 package/)
      .end(() => {
        const pkglockJSON = require(pkglockPath);
        // npm@^6 最后会生成 v1 的 lockfile
        assert.strictEqual(pkglockJSON.lockfileVersion, 2);
        assert.deepStrictEqual(pkglockJSON.dependencies, {
          'lodash.has': {
            version: '4.5.2',
            resolved: 'https://registry.npmmirror.com/lodash.has/download/lodash.has-4.5.2.tgz',
            integrity: 'sha1-0Z9NwQlQWMzL4rDN9O4P5Ko3yGI=',
          },
        });
        done();
      });
  });

  it('should install nothing', async () => {
    await coffee.fork(npminstall, [
      '--fs=rapid',
    ], {
      cwd: await fs.mkdtemp('tnpmci'),
      stdio: 'pipe',
    })
      .debug()
      .expect('code', 0);
  });

  describe('using lockId', () => {
    const cwd = path.join(fixtures, 'tnpm-install-rapid-force-fallback-with-lockId');
    const pkglockPath = path.join(cwd, 'package-lock.json');
    beforeEach(async () => {
      mm(process.env, 'TNPM_FORCE_RAPID_FALLBACK', 'true');
      await runscript(`rm -f ${pkglockPath}`);
      await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
    });

    afterEach(async () => {
      mm.restore();
      await runscript(`rm -f ${pkglockPath}`);
      await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
    });
    it('should success with lockId', done => {
      coffee.fork(npminstall, [
        '--by=rapid',
        '--lock-id=37e4e398d1a4f935659bb593822f621c',
      ], {
        cwd,
        stdio: 'pipe',
      })
        .debug()
        .expect('stdout', /added 1 package/)
        .end(() => {
          const pkglockJSON = require(pkglockPath);
          // npm@^6 最后会生成 v1 的 lockfile
          assert.strictEqual(pkglockJSON.lockfileVersion, 2);
          assert.deepStrictEqual(pkglockJSON.dependencies, {
            'lodash.has': {
              version: '4.5.2',
              resolved: 'https://registry.npmmirror.com/lodash.has/download/lodash.has-4.5.2.tgz',
              integrity: 'sha1-0Z9NwQlQWMzL4rDN9O4P5Ko3yGI=',
            },
          });
          done();
        });
    });
  });

  describe('corner case', () => {
    const cwd = path.join(fixtures, 'tnpm-install-rapid-force-fallback-1');
    const pkglockPath = path.join(cwd, 'package-lock.json');
    beforeEach(async () => {
      mm(process.env, 'TNPM_FORCE_RAPID_FALLBACK', 'true');
      await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
      await runscript(`rm -f ${path.join(cwd, 'package-lock.json.bak')}`);
    });

    afterEach(async () => {
      mm.restore();
      await runscript(`rm -rf ${path.join(cwd, 'node_modules')}`);
      await runscript(`rm -f ${path.join(cwd, 'package-lock.json.bak')}`);
    });

    it('should backup package-lock.json', async () => {
      await coffee.fork(npminstall, [
        '--by=rapid',
      ], {
        cwd,
        stdio: 'pipe',
      })
        // .debug()
        .expect('stdout', /added 1 package/)
        .end();
      const pkglockJSON = require(pkglockPath);
      // npm@^6 最后会生成 v1 的 lockfile
      assert.strictEqual(pkglockJSON.lockfileVersion, 2);
      assert.deepStrictEqual(pkglockJSON.dependencies, {
        'lodash.has': {
          version: '4.5.2',
          resolved: 'https://registry.npmmirror.com/lodash.has/download/lodash.has-4.5.2.tgz',
          integrity: 'sha1-0Z9NwQlQWMzL4rDN9O4P5Ko3yGI=',
        },
      });
      await fs.stat(path.join(cwd, 'package-lock.json.bak'));
    });
  });
});
