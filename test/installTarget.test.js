'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const readJSON = require('../lib/utils').readJSON;
const npminstall = require('./npminstall');
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

  afterEach(cleanup);

  it('should install to target dir', function* () {
    yield npminstall({
      root: tmp,
      targetDir: path.join(tmp, 'targetDir'),
      binDir: path.join(tmp, 'binDir'),
      pkgs: [
        { name: 'koa', version: 'latest' },
        { name: 'mocha', version: 'latest' },
      ],
    });

    let pkg = yield readJSON(path.join(tmp, 'targetDir/node_modules/koa/package.json'));
    assert(pkg.name, 'koa');
    pkg = yield readJSON(path.join(tmp, 'targetDir/node_modules/mocha/package.json'));
    assert(pkg.name, 'mocha');
    const pkgs = fs.readdirSync(path.join(tmp, 'targetDir/node_modules/'));
    assert(pkgs.indexOf('koa') >= 0);
    assert(pkgs.indexOf('mocha') >= 0);
    const bins = fs.readdirSync(path.join(tmp, 'binDir'));
    assert(bins.indexOf('mocha') >= 0);
    assert(bins.indexOf('_mocha') >= 0);
  });
});
