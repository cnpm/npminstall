'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('fix-bug-versions.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');
  const demo = path.join(__dirname, 'fixtures', 'fix-bug-versions-app');
  const bin = path.join(__dirname, '../bin/install.js');
  const update = path.join(__dirname, '../bin/update.js');

  function getPkg(subPath) {
    return JSON.parse(fs.readFileSync(path.join(tmp, subPath)));
  }

  function cleanup() {
    rimraf.sync(tmp);
    rimraf.sync(path.join(demo, 'node_modules'));
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should use fix version instead', done => {
    coffee.fork(bin, [
      'is-my-json-valid@2.17.0',
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /is-my-json-valid@2\.17\.1@is-my-json-valid/)
      .end(done);
  });

  it('should use fix dependencies instead', function* () {
    yield coffee.fork(bin, [
      'accord@0.28.0',
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stderr', /\[accord@0\.28\.0\] use dependencies: {\"less\":\"\^2.7.0\"} instead, reason:/)
      .end();

    assert(getPkg('node_modules/accord/package.json').version === '0.28.0');
    assert(getPkg('node_modules/accord/node_modules/less/package.json'));
    assert(getPkg('node_modules/accord/node_modules/less/package.json').version.split('.')[0] === '2');
  });

  it('should support on install and update', function* () {
    yield coffee.fork(bin, [
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: demo })
      .debug()
      .expect('code', 0)
      .expect('stdout', /is-my-json-valid@2\.17\.1@is-my-json-valid/)
      .end();

    yield coffee.fork(update, [
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: demo })
      .debug()
      .expect('code', 0)
      .expect('stdout', /is-my-json-valid@2\.17\.1@is-my-json-valid/)
      .end();
  });

  it('should not match version', done => {
    coffee.fork(bin, [
      'is-my-json-valid@2.16.0',
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /is-my-json-valid@2\.16\.0@is-my-json-valid/)
      .end(done);
  });

  it('should not match name', done => {
    coffee.fork(bin, [
      'mm',
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /mm@\* installed/)
      .end(done);
  });
});
