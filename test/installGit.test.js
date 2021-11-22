'use strict';

const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const fs = require('fs');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/installGit.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();
  beforeEach(cleanup);
  afterEach(cleanup);

  it.skip('should install ikt@git+http://ikt.pm2.io/ikt.git#master', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'ikt', version: 'git+http://ikt.pm2.io/ikt.git#master' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/ikt/package.json'));
    assert.equal(pkg.name, 'ikt');
  });

  it('should install github repo `node-modules/pedding` ok', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'node-modules/pedding' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert(pkg.version !== '0.0.3');
  });

  it('should install github repo `node-modules/pedding#0.0.3` ok', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'node-modules/pedding#0.0.3' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert.equal(pkg.version, '0.0.3');
  });

  it('should install from git with ssh `git+ssh://git@github.com:node-modules/pedding.git#0.0.2` ok', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+ssh://git@github.com:node-modules/pedding.git#0.0.2' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert.equal(pkg.version, '0.0.2');
  });

  it('should install from git with http `git+https://github.com/node-modules/pedding.git` ok', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+https://github.com/node-modules/pedding.git' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert(pkg.version !== '0.0.3');
  });

  it('should install from bitbucket `bitbucket:node-modules/pedding`', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'bitbucket:node-modules/pedding' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert(pkg.version !== '0.0.3');
  });

  it('should install from github with commit hash https://github.com/mozilla/nunjucks.git#0f8b21b8df7e8e852b2e1889388653b7075f0d09', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+https://github.com/mozilla/nunjucks.git#0f8b21b8df7e8e852b2e1889388653b7075f0d09' },
      ],
    });

    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/nunjucks/package.json'));
    assert.equal(pkg.name, 'nunjucks');
    assert.equal(pkg.version, '1.2.0');
  });

  it('should also ok on https://github.com/mozilla/nunjucks.git#0f8b21b8d', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+https://github.com/mozilla/nunjucks.git#0f8b21b8d' },
      ],
    });

    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/nunjucks/package.json'));
    assert.equal(pkg.name, 'nunjucks');
    assert.equal(pkg.version, '1.2.0');
  });

  it('should also ok on https://github.com/node-modules/agentkeepalive#2.x', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+https://github.com/node-modules/agentkeepalive#2.x' },
      ],
    });

    const pkg = await helper.readJSON(path.join(tmp, 'node_modules/agentkeepalive/package.json'));
    assert.equal(pkg.name, 'agentkeepalive');
  });

  it('should fail on some strange hash', async () => {
    try {
      await npminstall({
        root: tmp,
        pkgs: [
          { name: null, version: 'git+https://github.com/mozilla/nunjucks.git#wtf???!!!fail-here,hahaa' },
        ],
      });
    } catch (err) {
      assert(/\[@git\+https\:\/\/github.com\/mozilla\/nunjucks.git#wtf\?\?\?\!\!\!fail-here\,hahaa\] The git reference could not be found/.test(err.message));
    }

  });

  it('should warn on some name not match', done => {
    coffee.fork(helper.npminstall, [
      'error@git+https://github.com/mozilla/nunjucks.git#0f8b21b8d',
    ], {
      cwd: tmp,
    })
      .debug()
      .expect('code', 0)
      .expect('stderr', /Package name unmatched: expected error but found nunjucks/)
      .end(err => {
        assert(require(path.join(tmp, 'node_modules/error/package.json')).name === 'nunjucks');
        done(err);
      });
  });
  it('should install success', done => {
    coffee.fork(helper.npminstall, [
      'a@git+ssh://git@bitbucket.org/saibotsivad/demo-npm-git-semver.git#semver:1.0.3',
    ], {
      cwd: tmp,
    })
      .debug()
      .expect('code', 0)
      .end(() => {
        const nodeModulesDir = path.join(tmp, 'node_modules');
        // check package installed and linked
        const symlink = fs.readlinkSync(path.join(nodeModulesDir, 'a'));
        assert.strictEqual(require(path.join(nodeModulesDir, 'a/package.json')).name, 'demo-npm-git-semver');
        // check package real package existed
        assert.strictEqual(require(path.join(nodeModulesDir, `${symlink}/package.json`)).name, 'demo-npm-git-semver');
        done();
      });
  });
  it('should install with https success', done => {
    coffee.fork(helper.npminstall, [
      'a@git+https://git@bitbucket.org/saibotsivad/demo-npm-git-semver.git#semver:1.0.3',
    ], {
      cwd: tmp,
    })
      .debug()
      .expect('code', 0)
      .end(() => {
        const nodeModulesDir = path.join(tmp, 'node_modules');
        // check package installed and linked
        const symlink = fs.readlinkSync(path.join(nodeModulesDir, 'a'));
        assert.strictEqual(require(path.join(nodeModulesDir, 'a/package.json')).name, 'demo-npm-git-semver');
        // check package real package existed
        assert.strictEqual(require(path.join(nodeModulesDir, `${symlink}/package.json`)).name, 'demo-npm-git-semver');
        done();
      });
  });

});
