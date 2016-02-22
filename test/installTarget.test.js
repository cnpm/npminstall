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
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('../');
const fs = require('fs');

describe('test/installTarget.test.js', function() {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  // afterEach(cleanup);

  it('should install to target dir', function*() {
    yield npminstall({
      root: tmp,
      targetDir: path.join(tmp, 'targetDir'),
      pkgs: [
        {name: 'koa', version: 'latest'},
      ],
    });

    const pkg = yield readJSON(path.join(tmp, 'targetDir/node_modules/koa/package.json'));
    assert(pkg.name, 'koa');
    const pkgs = fs.readdirSync(path.join(tmp, 'targetDir/node_modules/.npminstall'));
    assert(pkgs.indexOf('koa') >= 0);
  });
});
