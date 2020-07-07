'use strict';

const mm = require('mm');
const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const npminstall = require('./npminstall');
const helper = require('./helper');
const cp = require('mz/child_process');

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
    mm.error(cp, 'exec');
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
          '--custom-china-mirror-url=http://cdn.npm.taobao.org/dist',
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
