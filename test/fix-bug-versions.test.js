'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const fs = require('fs');
const helper = require('./helper');

const bin = helper.npminstall;
const update = path.join(path.dirname(helper.npminstall), 'update.js');

describe('test/fix-bug-versions.test.js', () => {
  const demo = helper.fixtures('fix-bug-versions-app');
  const cleanupModules = helper.cleanup(demo);
  const [ tmp, cleanupTmp ] = helper.tmp();

  function getPkg(subPath) {
    return JSON.parse(fs.readFileSync(path.join(tmp, subPath)));
  }

  async function cleanup() {
    await Promise.all([
      cleanupModules(),
      cleanupTmp(),
    ]);
  }

  beforeEach(cleanup);
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

  it('should use fix dependencies instead', async () => {
    await coffee.fork(bin, [
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

  it('should support on install and update', async () => {
    await coffee.fork(bin, [
      '-d',
      '--fix-bug-versions',
      '--no-cache',
    ], { cwd: demo })
      .debug()
      .expect('code', 0)
      .expect('stdout', /is-my-json-valid@2\.17\.1@is-my-json-valid/)
      .end();

    await coffee.fork(update, [
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
