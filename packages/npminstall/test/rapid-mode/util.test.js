'use strict';

const assert = require('assert');
const mm = require('mm');
const os = require('os');
const { rimraf } = require('../../lib/utils');
const {
  getDisplayName,
  wrapSudo,
  generateBin,
  getEnv,
  getWorkdir,
  resolveBinMap,
} = require('../../lib/rapid-mode/util.js');

const mockDepLodash = {
  name: 'lodash',
  version: '1.0.0',
};

const nydusConfigFilePath = '/tmp/nydus.json';


describe('test/rapid-mode/util.test.js', () => {
  afterEach(async () => {
    await rimraf(nydusConfigFilePath);
  });

  it('getDisplayName should work', () => {
    const displayName = getDisplayName(mockDepLodash, 'npminstall');
    assert.strictEqual(displayName, '_lodash@1.0.0@lodash');
  });

  it('getDisplayName should work with npm', () => {
    const displayName = getDisplayName(mockDepLodash, 'npm');
    assert.strictEqual(displayName, 'lodash@1.0.0');
  });

  describe('wrapSudo', () => {
    afterEach(mm.restore);
    it('should root work', () => {
      mm(os, 'userInfo', () => ({
        username: 'root',
      }));
      const sh = wrapSudo('ls');
      assert.strictEqual(sh, 'ls');
    });
    it('should admin work', () => {
      mm(os, 'userInfo', () => ({
        username: 'admin',
      }));
      const sh = wrapSudo('ls');
      assert.strictEqual(sh, 'sudo ls');
    });
  });

  describe('generate bin', () => {
    it('should work with flattened pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: 'pkg/test',
        pkgPath: 'pkg',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../pkg/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with scoped pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: '@mockscope/pkg/test',
        pkgPath: '@mockscope/pkg',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../@mockscope/pkg/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with sub pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: 'pkg/node_modules/a/test',
        pkgPath: 'pkg/node_modules/a',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: 'pkg/node_modules/.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../a/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with sub scoped pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: '@mockscope/pkg/node_modules/a/test',
        pkgPath: '@mockscope/pkg/node_modules/a',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '@mockscope/pkg/node_modules/.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../a/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with sub scoped pkg with scoped parent pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: '@mockscope/pkg/node_modules/@mockscope/a/test',
        pkgPath: '@mockscope/pkg/node_modules/@mockscope/a',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '@mockscope/pkg/node_modules/.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../@mockscope/a/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
  });

  it('set env should work', () => {
    const env = getEnv({ foo: '1' }, [
      '--no-proxy',
      '--registry=https://registry.npmmirror.com',
      '--disturl=https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node',
    ]);
    assert.deepStrictEqual(env, {
      foo: '1',
      npm_config_argv: '{"remain":[],"cooked":["--no-proxy","--registry=https://registry.npmmirror.com","--disturl=https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node"],"original":["--no-proxy","--registry=https://registry.npmmirror.com","--disturl=https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node"]}',
      npm_config_registry: 'https://registry.npmmirror.com',
      npm_config_r: 'https://registry.npmmirror.com',
      npm_config_disturl: 'https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node',
    });
  });

  describe('getWorkdir', () => {
    before(() => {
      mm(process, 'cwd', () => '/cwd');
    });

    after(mm.restore);
    it('should getWorkdir work', async () => {
      const result = await getWorkdir(process.cwd());
      assert.deepStrictEqual(result, {
        nodeModulesDir: '/cwd/node_modules',
        dirname: 'cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e',
        baseDir: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e`,
        overlay: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay`,
        upper: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay/upper`,
        workdir: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay/workdir`,
        mnt: `${os.homedir()}/.npminstall/rapid-mode/mnt/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e`,
        tarIndex: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/tar.index.json`,
        bootstrap: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/nydusd-bootstrap`,
        depsJSONPath: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay/upper/.package-lock.json`,
        projectDir: `${os.homedir()}/.npminstall/rapid-mode/cwd_a875d54f3f579b69acac56867277fbf2`,
      });

    });
  });

  describe('resolveBinMap', () => {
    it('should work with single bin', async () => {
      const result = resolveBinMap({
        name: 'a',
        version: '1.0.0',
        bin: 'a.js',
      });

      assert.deepStrictEqual(result, {
        'a.js': [ 'a' ],
      });
    });
    it('should work with multiple bins with the same file', async () => {
      const result = resolveBinMap({
        name: 'a',
        version: '1.0.0',
        bin: {
          a: 'a.js',
          'a-cli': 'a.js',
        },
      });

      assert.deepStrictEqual(result, {
        'a.js': [ 'a', 'a-cli' ],
      });
    });
    it('should work with multiple bins with different files', async () => {
      const result = resolveBinMap({
        name: 'a',
        version: '1.0.0',
        bin: {
          a: 'a.js',
          b: 'b.js',
        },
      });

      assert.deepStrictEqual(result, {
        'a.js': [ 'a' ],
        'b.js': [ 'b' ],
      });
    });
  });
});
