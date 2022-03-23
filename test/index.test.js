'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const rimraf = require('mz-modules/rimraf');
const npminstall = require('./npminstall');
const utils = require('../lib/utils');
const readJSON = require('../lib/utils').readJSON;
const helper = require('./helper');

describe('test/index.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should npminstall with options.pkgs', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: '@rstacruz/tap-spec', version: '~4.1.1' },
        { name: 'mocha' },
        { name: 'pedding', version: 1 },
        { name: 'contributors' },
      ],
    });
    assert(await utils.isInstallDone(path.join(tmp, 'node_modules/mocha')));
  });

  it('should handle @types/escodegen@0.0.2 tgz', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: '@types/escodegen', version: '0.0.2' },
      ],
    });
    assert(await utils.isInstallDone(path.join(tmp, 'node_modules/@types/escodegen')));
    assert(await fs.exists(path.join(tmp, 'node_modules/@types/escodegen/package.json')));
    assert(require(path.join(tmp, 'node_modules/@types/escodegen/package.json')).name === '@types/escodegen');
  });

  it('should npminstall not exists package throw error', async () => {
    try {
      await npminstall({
        root: tmp,
        pkgs: [
          { name: 'mocha1111' },
        ],
      });
      throw new Error('should not run this');
    } catch (err) {
      console.log(err.stack);
      assert(/response 404 status/.test(err.message));
    }
  });

  it('should npminstall demo project', async () => {
    const demodir = path.join(__dirname, 'fixtures', 'demo');
    await rimraf(path.join(demodir, 'node_modules'));

    await npminstall({
      root: demodir,
    });
    const pkgfile = path.join(demodir, 'node_modules', 'koa', 'package.json');
    let pkg = JSON.parse(await fs.readFile(pkgfile));
    assert.equal(pkg.name, 'koa');

    // install again should be faster
    await npminstall({
      root: demodir,
    });
    pkg = JSON.parse(await fs.readFile(pkgfile));
    assert.equal(pkg.name, 'koa');
  });

  it('should relink exists link file work', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding', version: '0' },
      ],
    });
    const v0 = await readJSON(path.join(tmp, 'node_modules', 'pedding', 'package.json'));
    assert.equal(v0.version[0], '0');

    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding', version: '1' },
      ],
    });
    const v1 = await readJSON(path.join(tmp, 'node_modules', 'pedding', 'package.json'));
    assert.equal(v1.version[0], '1');
  });

  it('should request registry when not install from package.json', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-onerror', version: '1.2.0' },
      ],
    });

    const v1 = await readJSON(path.join(tmp, 'node_modules', 'koa-onerror', 'package.json'));
    assert.equal(v1.version, '1.2.0');

    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-onerror', version: '1' },
      ],
    });

    const v2 = await readJSON(path.join(tmp, 'node_modules', 'koa-onerror', 'package.json'));
    assert.equal(v2.version, '1.3.1');
  });

  it('should install chromedriver work', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'chromedriver', version: '2.10.0' },
      ],
    });
  });

  describe('_from, _resolved in package.json', () => {
    const root = helper.fixtures('packageMeta');
    const cleanup = helper.cleanup(root);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should add _from, _resolved to package.json', async () => {
      await npminstall({
        root,
      });
      // node_modules/.debug@2.2.0 should exists
      assert(await fs.exists(path.join(root, 'node_modules', '_debug@2.2.0@debug')));

      const debugPkg = await readJSON(path.join(root, 'node_modules', 'debug', 'package.json'));
      assert.equal(debugPkg._from, 'debug@2.2.0');
      assert(debugPkg._resolved);

      const peddingPkg = await readJSON(path.join(root, 'node_modules', 'pedding', 'package.json'));
      assert.equal(peddingPkg._from, 'pedding@https://registry.npmjs.org/pedding/-/pedding-1.0.0.tgz');
      assert.equal(peddingPkg._resolved, 'https://registry.npmjs.org/pedding/-/pedding-1.0.0.tgz');

      const bytesPkg = await readJSON(path.join(root, 'node_modules', 'bytes', 'package.json'));
      assert.equal(bytesPkg._from, 'bytes@https://github.com/visionmedia/bytes.js.git');
      assert(/git\+ssh\:\/\/git@github.com\/visionmedia\/bytes\.js\.git#\w+/.test(bytesPkg._resolved));
    });
  });
});
