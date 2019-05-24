'use strict';

const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = require.resolve('../bin/install.js');

describe('test/engine-strict.test.js', () => {
  const root = path.join(__dirname, 'fixtures', '.tmp');

  function cleanup() {
    rimraf.sync(root);
    mkdirp.sync(root);
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should show engine strict warn message', () => {
    return coffee.fork(npminstall, [
      'express@1',
    ], {
      cwd: root,
    })
    // .debug()
      .expect('stderr', /WARN node unsupported/)
      .expect('stderr', /All packages installed/)
      .expect('code', 0)
      .end();
  });

  it('should install fail when --engine-strict enable', () => {
    return coffee.fork(npminstall, [
      'express@1',
      '--engine-strict',
    ], {
      cwd: root,
    })
    // .debug()
      .expect('stderr', /Install fail! UnSupportedNodeError/)
      .expect('code', 1)
      .end();
  });
});
