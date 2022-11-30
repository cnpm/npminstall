'use strict';

const mm = require('mm');
const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const semver = require('semver');
const npminstall = require('./npminstall');
const helper = require('./helper');
const utils = require('../lib/utils');

describe('test/installLocal.test.js', () => {
  const root = helper.fixtures('local');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install local folder ok', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg' },
      ],
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local folder with copy ok', async () => {
    mm.error(utils, 'exec');
    await npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg' },
      ],
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local folder with relative path ok', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: null, version: './pkg' },
      ],
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local link folder ok', async () => {
    if (process.platform === 'win32') {
      return;
    }
    await npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg-link' },
      ],
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local gzip tarball ok', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:sequelize.tgz' },
      ],
    });

    const pkg = await helper.readJSON(path.join(root, 'node_modules/sequelize/package.json'));
    assert.equal(pkg.name, 'sequelize');
  });

  it('should install local link gzip tarball ok', async () => {
    if (process.platform === 'win32') {
      return;
    }
    await npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:sequelize-link.tgz' },
      ],
    });

    const pkg = await helper.readJSON(path.join(root, 'node_modules/sequelize/package.json'));
    assert.equal(pkg.name, 'sequelize');
  });

  it('should install local naked tarball ok', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: null, version: 'file:pkg.tar' },
      ],
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
    assert.equal(pkg.name, 'pkg');
  });

  it('should install local folder without package.json error', async () => {
    try {
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:not-pkg' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json missed/), err.message);
    }
  });

  it('should install local tarball without package.json error', async () => {
    try {
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:not-pkg.tar' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json missed/), err.message);
    }
  });

  it('should install local folder without package name error', async () => {
    try {
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg-without-name' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json must contains name/), err.message);
    }
  });

  it('should install local tarball without package name error', async () => {
    try {
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg-without-name.tgz' },
        ],
      });
      throw new Error('should not exec');
    } catch (err) {
      assert(err.message.match(/package.json must contains name/), err.message);
    }
  });

  it('should install local alias package ok', async () => {
    await npminstall({
      root,
      pkgs: [
        {
          name: 'lodash.has',
          version: '',
          alias: 'lodash-has',
        },
      ],
    });

    const pkg = await helper.readJSON(path.join(root, 'node_modules/lodash-has/package.json'));
    assert.strictEqual(pkg.name, 'lodash.has');
  });

  it('should install local alias package.json ok', async () => {
    const aliasRoot = path.join(root, 'alias');
    await npminstall({
      root: aliasRoot,
      pkgs: [],
    });

    const pkg1 = await helper.readJSON(path.join(aliasRoot, 'node_modules/lodash-has/package.json'));
    const pkg2 = await helper.readJSON(path.join(aliasRoot, 'node_modules/lodash-has-deprecated/package.json'));
    assert.strictEqual(pkg1.name, 'lodash.has');
    assert.strictEqual(semver.parse(pkg1.version).major, 4);
    assert.strictEqual(pkg2.name, 'lodash.has');
    assert.strictEqual(semver.parse(pkg2.version).major, 3);
  });

  if (process.platform !== 'win32') {
    it('should install the same tarball ok', async () => {
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg.tar' },
        ],
      });
      let pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg.tar' },
          // { name: null, version: 'file:pkg.tar' },
        ],
      });
      pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
    });

    it('should install the same local folder ok', async () => {
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg' },
        ],
      });
      let pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
      await npminstall({
        root,
        pkgs: [
          { name: null, version: 'file:pkg' },
          { name: null, version: 'file:pkg' },
        ],
      });
      pkg = await helper.readJSON(path.join(root, 'node_modules/pkg/package.json'));
      assert.equal(pkg.name, 'pkg');
    });

    if (process.env.npm_china) {
      it('should install from custom china mirror url work', () => {
        const cli = require.resolve('../bin/install');
        return coffee.fork(cli, [
          'phantomjs-prebuilt',
          '--custom-china-mirror-url=https://npmmirror.com/mirrors',
        ], {
          cwd: root,
        })
          .coverage(false)
          .debug()
          .expect('code', 0)
          .end();
      });
    }
  }
});
