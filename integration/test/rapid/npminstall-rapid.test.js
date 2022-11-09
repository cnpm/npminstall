'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../../../packages/npminstall/bin/install.js');
const fixtures = path.join(__dirname, 'fixtures');
const os = require('os');
const fs = require('fs');
const fsPromise = require('fs/promises');
const mm = require('mm');
const clean = require('npminstall/lib/clean');
const assert = require('assert');
const runscript = require('runscript');


describe('test/npminstall-rapid.test.js', () => {
  let fixture;
  afterEach(async () => {
 //   await clean(fixture);
  });

  describe('install-lodash', () => {
    it('should install lodash succeed', async () => {
      fixture = path.join(fixtures, 'rapid-lodash-test');
      await coffee
        .fork(npminstall, [ '--fs=rapid' ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
      assert(fs.existsSync(path.join(fixture, 'node_modules/lodash/package.json')));
      const { stdout } = await runscript('mount -l', { stdio: 'pipe' });
      assert(stdout.indexOf(path.join(fixture)) > 0);
    });
  });

  describe('nodeEnv is prod, test chair', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-chair');
    });

    it('should generate deps tree', async () => {
      await coffee.fork(npminstall, [
        '--fs=rapid',
        '--production',
        '--deps-tree-path=./tree.json',
      ], { cwd: fixture })
        .debug()
        .end();
    });
  });
  describe('nodeEnv is prod', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-prod');
    });

    it('should generate deps tree', async () => {
      await coffee.fork(npminstall, [
        '--fs=rapid',
        '--production',
        '--deps-tree-path=./tree.json',
      ], { cwd: fixture })
        .debug()
        .expect('stdout', /Error: Cannot find module 'object-pipeline'/)
        .end();
    });
  });

  describe('nodeEnv is all', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-all');
    });

    it('should generate deps tree', async () => {
      await coffee.fork(npminstall, [
        '--fs=rapid',
        '--deps-tree-path=./tree.json',
      ], { cwd: fixture })
        .debug(0)
        .expect('code', 0)
        .expect('stdout', /preinstall\./)
        .expect('stdout', /postinstall\./)
        .end();
    });
  });

  describe('argument abbreviation', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-prod');
    });

    it('should work with argument abbreviation', async () => {
      await coffee.fork(npminstall, [
        '-sst',
        '--production',
        '--deps-tree-path=./tree.json',
      ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('bundledDependencies', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-bundles');
    });

    it('should generate deps tree', async () => {
      await coffee.fork(npminstall, [
        '--fs=rapid',
        '--deps-tree-path=./tree.json',
      ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('--deps-tree-path args', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-download-local-deps');
      // mock linux+fuse system
      mm(os, 'type', () => {
        return 'Linux';
      });
      mm(fs, 'stat', async () => {
        return {
          dev: 115,
          mode: 8624,
          nlink: 1,
          uid: 0,
          gid: 0,
          rdev: 10,
          blksize: 4096,
          ino: 1813631,
          size: 0,
          blocks: 0,
          atimeMs: 1623058357707.611,
          mtimeMs: 1623058357707.611,
          ctimeMs: 1623058357707.611,
          birthtimeMs: 0,
          atime: '2021-06-07T09:32:37.708Z',
          mtime: '2021-06-07T09:32:37.708Z',
          ctime: '2021-06-07T09:32:37.708Z',
          birthtime: '1970-01-01T00:00:00.000Z',
        };
      });
    });

    it('should generate deps tree', async () => {
      await coffee.fork(npminstall, [ '--by=rapid', '--deps-tree-path=./tree.json' ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
    });
  });


  describe('--by=rapid and mode is npm or yarn', () => {

    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-force-to-yarn-mode');
    });

    it('should use npm or yarn mode', async () => {
      await coffee.fork(npminstall, [ '--by=rapid' ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .expect('stdout', /added 1 package from 3 contributors/)
        .end();
    });
  });

  describe('--by=rapid using deps tree v2', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-dep-tree-v2');
    });
    it('should work', async () => {
      await coffee.fork(npminstall, [ '--by=rapid', '--deps-tree-path=./tree-v2.json' ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('--by=npminstall --fs=rapid', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-download-local-deps');
    });

    it('should work', async () => {
      await coffee.fork(npminstall, [
        '--by=npminstall',
        '--fs=rapid',
        '--deps-tree-path=./package-lock.json',
      ], {
        cwd: fixture,
      })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

describe('test/tnpm-rapid-workspace.test.js', () => {
  let cwd;

  afterEach(async () => {
 //   await clean(cwd);
  });

  it('should install lodash succeed', async () => {
    cwd = path.join(__dirname, './fixtures/workspace');
    await runscript(`node ${npminstall} --fs=rapid`, { cwd });

    assert(fs.existsSync(path.join(cwd, 'node_modules/lodash/package.json')));
    assert(!fs.existsSync(path.join(cwd, 'packages/lodash-1/node_modules/lodash/package.json')));
    assert(fs.existsSync(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    const lodash1 = JSON.parse(await fsPromise.readFile(path.join(cwd, 'node_modules/lodash/package.json')));
    const lodash2 = JSON.parse(await fsPromise.readFile(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    assert(lodash1.version.startsWith('1.'));
    assert(lodash2.version.startsWith('2.'));
  });
});
});
