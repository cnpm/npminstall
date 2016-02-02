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
const npminstall = require('../');
const mkdirp = require('../lib/utils').mkdirp;

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
        { name: 'mocha' },
        { name: 'pedding', version: 1 },
      ],
    });
  });

  it('should npminstall demo project', function*() {
    const demodir = path.join(__dirname, 'fixtures', 'demo');
    rimraf.sync(path.join(demodir, '.npminstall'));
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
});
