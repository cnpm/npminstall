/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');

describe('test/installGit.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it.skip('should install ikt@git+http://ikt.pm2.io/ikt.git#master', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'ikt', version: 'git+http://ikt.pm2.io/ikt.git#master' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/ikt/package.json'));
    assert.equal(pkg.name, 'ikt');
  });

  it('should install github repo `node-modules/pedding` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'node-modules/pedding' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert(pkg.version !== '0.0.3');
  });

  it('should install github repo `node-modules/pedding#0.0.3` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'node-modules/pedding#0.0.3' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert.equal(pkg.version, '0.0.3');
  });

  it('should install from git with ssh `git+ssh://git@github.com:node-modules/pedding.git#0.0.2` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+ssh://git@github.com:node-modules/pedding.git#0.0.2' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert.equal(pkg.version, '0.0.2');
  });

  it('should install from git with http `git+https://github.com/node-modules/pedding.git` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+https://github.com/node-modules/pedding.git' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert(pkg.version !== '0.0.3');
  });

  it('should install from bitbucket `bitbucket:node-modules/pedding`', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'bitbucket:node-modules/pedding' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert.equal(pkg.name, 'pedding');
    assert(pkg.version !== '0.0.3');
  });

  it('should install from github with commit hash https://github.com/mozilla/nunjucks.git#0f8b21b8df7e8e852b2e1889388653b7075f0d09', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        {name: null, version: 'git+https://github.com/mozilla/nunjucks.git#0f8b21b8df7e8e852b2e1889388653b7075f0d09'},
      ],
    });

    const pkg = yield readJSON(path.join(tmp, 'node_modules/nunjucks/package.json'));
    assert.equal(pkg.name, 'nunjucks');
    assert.equal(pkg.version, '1.2.0');
  });

  it('should also ok on https://github.com/mozilla/nunjucks.git#0f8b21b8d', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        {name: null, version: 'git+https://github.com/mozilla/nunjucks.git#0f8b21b8d'},
      ],
    });

    const pkg = yield readJSON(path.join(tmp, 'node_modules/nunjucks/package.json'));
    assert.equal(pkg.name, 'nunjucks');
    assert.equal(pkg.version, '1.2.0');
  });

  it('should fail on some strange hash', function*() {
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          {name: null, version: 'git+https://github.com/mozilla/nunjucks.git#wtf???!!!fail-here,hahaa'},
        ],
      });
    } catch (err) {
      assert(/Run "sh -c git checkout wtf\?\?\?!!!fail-here,hahaa" error, exit code 1/.test(err.message), err.message);
    }


  });
});
