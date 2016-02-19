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
const npminstall = require('../');

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

  it('should install github repo `node-modules/pedding` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'node-modules/pedding' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert(pkg.name, 'pedding');
  });

  it('should install github repo `node-modules/pedding#0.0.3` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'node-modules/pedding#0.0.3' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert(pkg.name, 'pedding');
    assert(pkg.version, '0.0.3');
  });

  it('should install from git with ssh `git+ssh://git@github.com:node-modules/pedding.git#0.0.3` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+ssh://git@github.com:node-modules/pedding.git#0.0.3' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert(pkg.name, 'pedding');
    assert(pkg.version, '0.0.3');
  });

  it('should install from git with http `git+https://github.com/node-modules/pedding.git` ok', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'git+https://github.com/node-modules/pedding.git' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert(pkg.name, 'pedding');
  });

  it('should install from bitbucket `bitbucket:dead_horse1/pedding`', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: null, version: 'bitbucket:dead_horse1/pedding' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/pedding/package.json'));
    assert(pkg.name, 'pedding');
  });
});
