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
const npminstall = require('../');

describe('test/sameMaxRange.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function() {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);


  it('should install same max range ok', function*() {
    const options = {
      root: tmp,
      cacheDir: null,
      pkgs: [
        {name: 'debug', version: '~2.1.0'},
        {name: 'debug', version: '~2.1.1'},
      ],
    };
    yield npminstall(options);
    assert(options.cache['install:debug:range:2.2.0'].package.version);
  });
});
