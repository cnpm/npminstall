'use strict';

const path = require('path');
const assert = require('assert');
const fs = require('fs');
const promisify = require('util').promisify;
const runscript = require('runscript');
const { mkdirp } = require('../../lib/utils');
const mm = require('mm');
const nock = require('nock');
const config = require('../../lib/config');
const {
  download,
} = require('../../lib/rapid-mode/download_dependency');
const {
  tarBucketsDir,
} = require('../../lib/rapid-mode/constants');
const util = require('../../lib/rapid-mode/util');
const os = require('os');

const readdir = promisify(fs.readdir);

async function prepareEnv(CWD) {
  const { baseDir } = await util.getWorkdir(CWD);
  await mkdirp(baseDir);
}

describe('test/rapid-mode/download_dependency.test.js', () => {
  if (os.platform() === 'win32') {
    return;
  }

  before(async () => {
    await mkdirp(tarBucketsDir);
  });

  afterEach(async () => {
    mm.restore();
    nock.cleanAll();
    await runscript(`rm -f ${tarBucketsDir}/*`);
  });

  it('should work', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-download');
    await prepareEnv(CWD);
    const result = await download({
      production: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      depsTreePath: path.join(CWD, 'tree.json'),
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
    });

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });

  it.skip('should run postinstall scripts in real pkg dir in npminstall mode', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-postinstall');
    await prepareEnv(CWD);
    const options = {
      production: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npminstall',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
      pkg: require(path.join(CWD, 'package.json')),
    };
    const result = await download(options);

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
    assert(result.postinstallTasks[0].root.includes('_@mockscope/ci@4.37.1@@mockscope/ci'));
  });

  it.skip('should run postinstall scripts in real pkg dir in npm mode', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-postinstall');
    await prepareEnv(CWD);
    const options = {
      production: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npm',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
      pkg: require(path.join(CWD, 'package.json')),
    };
    const result = await download(options);

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
    assert(result.postinstallTasks[0].root.includes('node_modules/@mockscope/ci'));
  });

  it.skip('should run preinstall scripts in real pkg `upper` dir in npminstall mode', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-preinstall');
    await prepareEnv(CWD);
    const options = {
      production: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npminstall',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
      pkg: require(path.join(CWD, 'package.json')),
    };
    const result = await download(options);
    const { upper } = await util.getWorkdir(CWD);
    assert.strictEqual(result.preinstallTasks[0].root, path.join(upper, '_@mockscope_tnpm-scripts-test@1.0.0@@mockscope/tnpm-scripts-test'));
  });

  it.skip('should run preinstall scripts in real pkg `upper` dir in npm mode', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-preinstall');
    await prepareEnv(CWD);
    const options = {
      production: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npm',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
      pkg: require(path.join(CWD, 'package.json')),
    };
    const result = await download(options);
    const { upper } = await util.getWorkdir(CWD);
    assert.strictEqual(result.preinstallTasks[0].root, path.join(upper, '@mockscope/tnpm-scripts-test'));
  });

  it('should use local deps tree json', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-download-local-deps');
    await prepareEnv(CWD);
    const result = await download({
      production: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      depsTreePath: path.join(CWD, 'package-lock.json'),
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
    });

    assert.deepStrictEqual(result.depsTree.packages['node_modules/uuid'], {
      version: '8.3.2',
      integrity: 'sha1-gNW1ztJxu5r2xEXyGhoExgbO++I=',
      bin: {
        uuid: 'dist/bin/uuid',
      },
      resolved: 'https://registry.npmmirror.com/uuid/download/uuid-8.3.2.tgz',
    });

    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });

  it.skip('should fallback to server side deps tree generating when path is invalid', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-download-local-deps');
    await prepareEnv(CWD);
    const result = await download({
      production: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      depsTreePath: path.join(CWD, 'file-not-found.json'),
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
    });

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });

  // 这个测试太慢了会超时
  it.skip('predownload should work', async () => {
    const CWD = path.join(__dirname, './fixtures/rapid-mode-download');
    const result = await download({
      production: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      root: CWD,
      cwd: CWD,
      registry: config.registry,
    });
    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
  });
});
