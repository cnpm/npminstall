'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');

describe('package-version-mapping-file.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');
  const demo = path.join(__dirname, 'fixtures', 'package-version-mapping-file-app');
  const mappingFile = path.join(__dirname, 'fixtures', 'package-version-mapping.json');
  const bin = path.join(__dirname, '../bin/install.js');
  const update = path.join(__dirname, '../bin/update.js');

  function cleanup() {
    rimraf.sync(tmp);
    rimraf.sync(path.join(demo, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should use 1.1.0 instead of 1.0.0', done => {
    coffee.fork(bin, [
      'pedding@1.0.0',
      '--package-version-mapping-file=' + mappingFile,
      '-d',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /pedding@1\.1\.0@pedding/)
      .end(done);
  });

  it('should support on install and update', function* () {
    yield coffee.fork(bin, [
      '--package-version-mapping-file=' + mappingFile,
      '-d',
      '--no-cache',
    ], { cwd: demo })
      .debug()
      .expect('code', 0)
      .expect('stdout', /pedding@1\.1\.0@pedding/)
      .end();

    yield coffee.fork(update, [
      '--package-version-mapping-file=' + mappingFile,
      '-d',
      '--no-cache',
    ], { cwd: demo })
      .debug()
      .expect('code', 0)
      .expect('stdout', /pedding@1\.1\.0@pedding/)
      .end();
  });

  it('should not match version', done => {
    coffee.fork(bin, [
      'pedding@0.0.1',
      '--package-version-mapping-file=' + mappingFile,
      '-d',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /pedding@0\.0\.1@pedding/)
      .end(done);
  });

  it('should not match name', done => {
    coffee.fork(bin, [
      'mm',
      '--package-version-mapping-file=' + mappingFile,
      '-d',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /mm@\* installed/)
      .end(done);
  });
});
