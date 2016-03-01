/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const npminstall = require('./npminstall');
const mkdirp = require('../lib/utils').mkdirp;
const readJSON = require('../lib/utils').readJSON;

describe('test/index.test.js', function() {

  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function*() {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  it('should npminstall with options.pkgs', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: '@rstacruz/tap-spec', version: '~4.1.1' },
        { name: 'mocha' },
        { name: 'pedding', version: 1 },
        { name: 'contributors' },
      ],
    });
  });

  it('should npminstall not exists package throw error', function*() {
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'mocha1111' },
        ],
      });
      throw new Error('should not run this');
    } catch (err) {
      assert(/response 404 status/.test(err.message));
    }
  });

  it('should npminstall demo project', function*() {
    const demodir = path.join(__dirname, 'fixtures', 'demo');
    rimraf.sync(path.join(demodir, 'node_modules'));

    yield npminstall({
      root: demodir,
    });
    const pkgfile = path.join(demodir, 'node_modules', 'koa', 'package.json');
    let pkg = JSON.parse(fs.readFileSync(pkgfile));
    assert.equal(pkg.name, 'koa');

    // install again should be faster
    yield npminstall({
      root: demodir,
    });
    pkg = JSON.parse(fs.readFileSync(pkgfile));
    assert.equal(pkg.name, 'koa');
  });

  it('should relink exists link file work', function*() {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding', version: '0' },
      ],
    });
    const v0 = yield readJSON(path.join(tmp, 'node_modules', 'pedding', 'package.json'));
    assert.equal(v0.version[0], '0');

    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'pedding', version: '1' },
      ],
    });
    const v1 = yield readJSON(path.join(tmp, 'node_modules', 'pedding', 'package.json'));
    assert.equal(v1.version[0], '1');
  });
});
