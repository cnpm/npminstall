'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('mz/fs');
const link = require('../lib/link');

describe('test/link.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should link same path work', function* () {
    const pkg = {
      name: 'linkfoo',
      version: '1.0.0',
    };
    const parentDir = path.join(tmp, 'parentDir');
    const realDir = path.join(tmp, 'realDir', pkg.name, pkg.version);
    mkdirp.sync(realDir);
    yield link(parentDir, pkg, realDir);
    yield link(parentDir, pkg, realDir);
    yield link(parentDir, pkg, realDir);
    const linkString = yield fs.readlink(path.join(parentDir, 'node_modules', pkg.name));
    if (process.platform === 'win32') {
      assert.equal(linkString, realDir + '\\');
    } else {
      assert.equal(linkString, '../../realDir/linkfoo/1.0.0');
    }
  });
});
