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
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('mz/fs');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/installSaveDeps.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  beforeEach(() => {
    rimraf.sync(tmp);
    mkdirp.sync(tmp);
  });
  afterEach(() => {
    rimraf.sync(tmp);
  });

  it('should install --save pedding and update dependencies', done => {
    coffee.fork(npminstall, [
      '--save',
      'pedding',
    ], {
      cwd: tmp,
    })
    .expect('stdout', /\[pedding@\*\] installed/)
    .expect('code', 0)
    .end(err => {
      assert(!err, err && err.message);

      const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
      assert(deps);
      assert(deps.pedding);
      assert.equal(typeof deps.pedding, 'string');
      assert(/^[\^\~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

      done();
    });
  });

  it('should install --save-dev pedding and update devDependencies', done => {
    coffee.fork(npminstall, [
      '--save-dev',
      'pedding@0',
    ], {
      cwd: tmp,
    })
    .expect('stdout', /\[pedding@0\] installed/)
    .expect('code', 0)
    .end(err => {
      assert(!err, err && err.message);
      const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).devDependencies;
      assert(deps);
      assert(deps.pedding);
      assert.equal(typeof deps.pedding, 'string');
      assert(/^[\^\~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

      done();
    });
  });

  it('should install --save-optional pedding and update optionalDependencies', done => {
    coffee.fork(npminstall, [
      '--save-optional',
      'pedding@1',
    ], {
      cwd: tmp,
    })
    .expect('stdout', /\[pedding@1\] installed/)
    .expect('code', 0)
    .end(err => {
      assert(!err, err && err.message);
      const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).optionalDependencies;
      assert(deps);
      assert(deps.pedding);
      assert.equal(typeof deps.pedding, 'string');
      assert(/^[\^\~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

      done();
    });
  });
});
