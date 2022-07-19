'use strict';

const path = require('path');
const assert = require('assert');
const { rimraf, mkdirp } = require('../../lib/utils');
const mm = require('mm');
const fs = require('fs').promises;
const originFs = require('fs');
const Scripts = require('../../lib/rapid-mode/scripts').Scripts;
const util = require('../../lib/rapid-mode/util');
const { install } = require('../../lib/rapid-mode/install');
const nydusd = require('../../lib/rapid-mode/nydusd');
const downloadDependency = require('../../lib/rapid-mode/download_dependency');

const fixture = path.join(__dirname, './fixtures/rapid-mode-scripts');

describe('test/rapid-mode/scripts.test.js', () => {
  const fakePackage = 'fake-npm';
  const upperdir = path.join(fixture, 'upperdir');
  const projectDir = path.join(fixture, 'node_modules', fakePackage);

  const fakeOptions = {
    root: fixture,
    console: global.console,
  };

  before(async () => {
    await mkdirp(projectDir);
    mm(util, 'getWorkdir', async () => ({
      upper: upperdir,
      depsJSONPath: path.join(fixture, '.package-lock.json'),
      baseDir: fixture,
    }));
  });

  after(async () => {
    await rimraf(path.join(fixture, 'node_modules'));
    mm.restore();
  });
  it('should store and run preinstall scripts', async () => {
    const scripts = new Scripts({
      options: fakeOptions,
    });

    await scripts.storePreinstallScripts({
      name: 'fake-npm',
      version: '1.0.0',
      scripts: {
        preinstall: 'echo preinstall > 1',
      },
    }, 'fake-npm');

    console.info('scripts.preinstallTasks: ', scripts.preinstallTasks);
    assert.deepStrictEqual(scripts.preinstallTasks[0], {
      pkg: {
        name: 'fake-npm',
        version: '1.0.0',
        scripts: {
          preinstall: 'echo preinstall > 1',
        },
      },
      root: path.join(upperdir, 'fake-npm'),
      displayName: 'fake-npm@1.0.0',
    });

    await Scripts.runPreinstallScripts(scripts.preinstallTasks, fakeOptions);
    const { upper } = await util.getWorkdir();
    const data = await fs.readFile(path.join(upper, 'fake-npm', '1'), 'utf-8');
    assert.strictEqual(data, 'preinstall\n');
  });

  it('should store and run postinstall scripts', async () => {
    const scripts = new Scripts({
      options: fakeOptions,
    });

    scripts.storePostinstallScripts({
      name: 'fake-npm',
      version: '1.0.0',
      scripts: {
        install: 'echo install > 2',
        postinstall: 'echo postinstall > 3',
      },
    }, 'node_modules/fake-npm');

    assert.deepStrictEqual(scripts.postinstallTasks[0], {
      pkg: {
        name: 'fake-npm',
        version: '1.0.0',
        scripts: {
          install: 'echo install > 2',
          postinstall: 'echo postinstall > 3',
        },
      },
      root: 'node_modules/fake-npm',
      optional: false,
      displayName: 'fake-npm@1.0.0',
    });

    await Scripts.runPostinstallScripts(scripts.postinstallTasks, fakeOptions);
    const install = await fs.readFile(path.join(projectDir, '2'), 'utf-8');
    const postinstall = await fs.readFile(path.join(projectDir, '3'), 'utf-8');
    assert.strictEqual(install, 'install\n');
    assert.strictEqual(postinstall, 'postinstall\n');
  });

  describe('node-gyp scripts', () => {
    beforeEach(() => {
      mm(originFs, 'existsSync', () => true);
    });
    afterEach(mm.restore);

    it('should store node-gyp as install script', async () => {
      const scripts = new Scripts({
        options: fakeOptions,
      });

      scripts.storePostinstallScripts({
        name: 'fake-npm',
        version: '1.0.0',
        scripts: {
          postinstall: 'echo postinstall > 3',
        },
      }, 'node_modules/fake-npm');

      assert.deepStrictEqual(scripts.postinstallTasks, [
        {
          pkg: {
            name: 'fake-npm',
            version: '1.0.0',
            scripts: {
              install: 'node-gyp rebuild',
            },
          },
          root: 'node_modules/fake-npm',
          optional: false,
          displayName: 'fake-npm@1.0.0',
        }]);
    });
  });

  describe('project scripts', () => {
    const tmpFilePath = path.join(fixture, '1');
    beforeEach(async () => {
      await rimraf(tmpFilePath);
    });
    afterEach(async () => {
      await rimraf(tmpFilePath);
    });
    it('should run project installation scripts', () => {
      const scripts = new Scripts({
        options: fakeOptions,
      });

      Scripts.storeProjectScripts({
        pkg: {
          name: 'fake-npm',
          version: '1.0.0',
          scripts: {
            postinstall: 'echo postinstall',
          },
        },
        root: fixture,
      }, scripts.preinstallTasks, scripts.postinstallTasks);
      assert.deepStrictEqual(scripts.preinstallTasks, []);
      assert.deepStrictEqual(scripts.postinstallTasks, [
        {
          pkg: {
            name: 'fake-npm',
            version: '1.0.0',
            scripts: {
              postinstall: 'echo postinstall',
            },
          },
          root: '.',
          optional: false,
          displayName: 'fake-npm@1.0.0',
        },
      ]);
    });

    it('should run prepublish/preprepare/prepare/postprepare scripts', async () => {
      await Scripts.runProjectExtraScripts({
        root: fixture,
        console: global.console,
        pkg: {
          name: 'fake-npm',
          version: 'fake-version-1.0.0',
          scripts: {
            prepublish: 'echo prepublish >> 1',
            preprepare: 'echo preprepare >> 1',
            prepare: 'echo prepare >> 1',
            postprepare: 'echo postprepare >> 1',
          },
        },
      });

      const fileContent = await fs.readFile(path.join(fixture, '1'), 'utf8');
      assert.strictEqual(fileContent.toString(), 'prepublish\npreprepare\nprepare\npostprepare\n');
    });
    describe('project scripts', async () => {
      const fixtures = path.join(__dirname, './fixtures/project-scripts');
      beforeEach(async () => {
        mm(process, 'cwd', () => fixtures);
        mm(nydusd, 'startNydusFs', async () => { });
        mm(downloadDependency, 'download', async () => {
          return {
            depsTree: [ 1 ],
            preinstallTasks: [],
            postinstallTasks: [],
          };
        });
        await rimraf(path.join(fixtures, '1'));
        mm(util, 'getWorkdir', async () => ({
          upper: upperdir,
          depsJSONPath: path.join(fixture, '.package-lock.json'),
          baseDir: fixture,
          tarIndex: path.join(fixtures, 'index.json'),
        }));

      });
      afterEach(async () => {
        await rimraf(path.join(fixtures, '1'));
        mm.restore();
      });

      it('should run all project installation scripts', async () => {
        const pkg = require(path.join(fixtures, 'package.json'));
        await install({
          pkg,
          root: fixtures,
          console: global.console,
        });

        const fileContent = await fs.readFile(path.join(fixtures, '1'), 'utf8');
        assert.strictEqual(fileContent.toString(), 'preinstall\ninstall\npostinstall\nprepublish\npreprepare\nprepare\npostprepare\n');
      });
    });
  });
});
