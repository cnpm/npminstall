'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('mz/fs');
const readJSON = require('../lib/utils').readJSON;
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');

describe('test/optionalDependencies.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');
  const root = path.join(__dirname, 'fixtures', 'optional');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(tmp);
  }

  beforeEach(function() {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should install optionalDependencies', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'koa-redis', version: 'latest' },
      ],
    });
    const pkg = yield readJSON(path.join(tmp, 'node_modules/koa-redis/package.json'));
    assert(pkg.optionalDependencies.hiredis);

    const dirs = yield fs.readdir(path.join(tmp, 'node_modules/koa-redis/node_modules'));
    assert(dirs.indexOf('hiredis') >= 0);
  });

  it('should ignore optionalDependencies install error', function* () {
    yield npminstall({
      root,
    });

    const dirs = yield fs.readdir(path.join(root, 'node_modules'));
    assert.equal(dirs.indexOf('@dead_horse/not-exist'), -1);

    // less should exists
    const pkg = yield readJSON(path.join(root, 'node_modules/less/package.json'));
    assert(pkg.optionalDependencies.mkdirp);
    const pkg2 = yield readJSON(path.join(root, 'node_modules/less/node_modules/mkdirp/package.json'));
    assert.equal(pkg2.name, 'mkdirp');
  });
});
