'use strict';


const { forceFallbackInstall, install } = require('../../lib/rapid-mode/install');
const path = require('path');
const assert = require('assert');
const mm = require('mm');
const { rimraf, mkdirp } = require('../../lib/utils');
const fs = require('fs').promises;
const nydusd = require('../../lib/rapid-mode/nydusd');
const util = require('../../lib/rapid-mode/util');
const downloadDependency = require('../../lib/rapid-mode/download_dependency');
const os = require('os');

describe('test/rapid-mode/install.test.js', () => {
  if (os.platform() === 'win32') {
    return;
  }

  const fixtures = path.join(__dirname, './fixtures/force_fallback_install');

  beforeEach(() => {
    mm(util, 'getWorkDir', async () => ({
      overlay: 'mock_overlay',
      upper: 'mock_upper',
      depsJSONPath: path.join(fixtures, 'deps.json'),
    }));
  });

  afterEach(() => mm.restore);

  it.skip('should save existing package-lock.json to package-lock.json.bak', async () => {
    const fixtures = path.join(__dirname, './fixtures/force_fallback_install_bak');
    await forceFallbackInstall({
      pkg: {
        dependencies: {
          'lodash.has': '4.5.2',
        },
      },
      depsTreePath: path.join(fixtures, 'mock-deps-tree.json'),
      root: fixtures,
    });

    assert.deepStrictEqual(require(path.join(fixtures, 'package-lock.json')), {});
    assert.deepStrictEqual(require(path.join(fixtures, 'package-lock.json.bak')), {});
  });

  describe('deps tree file', () => {
    const fixtures = path.join(__dirname, './fixtures/write-package-lock');
    beforeEach(async () => {
      mm(process, 'cwd', () => fixtures);
      mm(nydusd, 'startNydusFs', async () => {
        const { upper } = await util.getWorkdir(fixtures);
        await mkdirp(upper);
      });
      mm(downloadDependency, 'download', async () => {
        return {
          depsTree: {
            name: 'foo',
            lockfileVersion: 2,
            requires: true,
          },
          preinstallTasks: [],
          postinstallTasks: [],
        };
      });
      await rimraf(path.join(fixtures, '1'));
    });
    afterEach(async () => {
      const { overlay } = await util.getWorkdir(fixtures);
      await rimraf(overlay);
    });

    it('should write deps tree file .package-lock.json in node_modules', async () => {
      const pkg = require(path.join(fixtures, 'package.json'));
      await install({
        pkg,
        root: fixtures,
        console: global.console,
      });
      const { depsJSONPath } = await util.getWorkdir(fixtures);
      const fileContent = await fs.readFile(depsJSONPath, 'utf8');
      const pkgJSON = JSON.parse(fileContent);
      assert.deepStrictEqual(pkgJSON, {
        name: 'foo',
        lockfileVersion: 2,
        requires: true,
      });
    });
  });

  describe('set env npm_config_xx before install', () => {
    const fixtures = path.join(__dirname, './fixtures/project-scripts-env');
    const envJsonPath = path.join(fixtures, '1.json');
    beforeEach(async () => {
      mm(process, 'cwd', () => fixtures);
      mm(nydusd, 'startNydusFs', async () => {
        const { upper } = await util.getWorkdir(fixtures);
        await mkdirp(upper);
      });
      mm(downloadDependency, 'download', async () => {
        return {
          depsTree: {
            name: 'foo',
            lockfileVersion: 2,
            requires: true,
          },
          preinstallTasks: [],
          postinstallTasks: [],
        };
      });
      await rimraf(envJsonPath);
    });
    afterEach(async () => {
      await rimraf(envJsonPath);
    });
    it('should work', async () => {
      const pkg = require(path.join(fixtures, 'package.json'));
      await install({
        root: fixtures,
        pkg,
        args: [
          '--disturl=https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node',
        ],
      });
      const jsonStr = await fs.readFile(envJsonPath, 'utf8');
      const env = JSON.parse(jsonStr);
      assert(env.npm_config_disturl, 'https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node');
    });
  });
});
