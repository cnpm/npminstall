'use strict';

const assert = require('assert');
const path = require('path');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/linkLatestVersion.test.js', () => {
  const root = helper.fixtures('link-latest-version');
  const cleanup = helper.cleanup(root);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install latest version to node_modules', async () => {
    const names = [ 'debug', 'ms', 'iconv-lite', 'utility' ];
    await npminstall({
      root,
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules', 'urllib', 'package.json'));
    assert.equal(pkg.version, '2.7.1');

    const versions = {};
    for (const name of names) {
      const pkg = await helper.readJSON(path.join(root, 'node_modules', name, 'package.json'));
      versions[pkg.name] = pkg.version;
    }

    const pkg2 = await helper.readJSON(path.join(root,
      'node_modules', 'iconv-lite', 'package.json'));
    assert.equal(pkg2.name, 'iconv-lite');

    await npminstall({
      root,
      pkgs: [{ name: 'toshihiko', version: '1.0.0-alpha.10' }],
    });

    for (const name of names) {
      const pkg = await helper.readJSON(path.join(root, 'node_modules', name, 'package.json'));
      assert.strictEqual(pkg.version, versions[pkg.name]);
    }
  });

  it('should force link latest version to node_modules', async () => {
    const names = [ 'debug', 'ms', 'iconv-lite', 'utility' ];
    await npminstall({
      root,
      forceLinkLatest: true,
    });
    const pkg = await helper.readJSON(path.join(root, 'node_modules', 'urllib', 'package.json'));
    assert.equal(pkg.version, '2.7.1');

    const versions = {};
    for (const name of names) {
      const pkg = await helper.readJSON(path.join(root, 'node_modules', name, 'package.json'));
      versions[pkg.name] = pkg.version;
    }

    const pkg2 = await helper.readJSON(path.join(root,
      'node_modules', 'iconv-lite', 'package.json'));
    assert.equal(pkg2.name, 'iconv-lite');

    await npminstall({
      root,
      pkgs: [{ name: 'toshihiko', version: '1.0.0-alpha.10' }],
      forceLinkLatest: true,
    });

    for (const name of names) {
      const pkg = await helper.readJSON(path.join(root, 'node_modules', name, 'package.json'));
      switch (name) {
        case 'debug':
        case 'iconv-lite':
          assert.strictEqual(pkg.version, versions[pkg.name]);
          break;

        case 'ms':
        case 'utility':
        default:
          assert(pkg.version !== versions[pkg.name]);
          break;
      }
    }
  });
});
