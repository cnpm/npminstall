'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const path = require('path');
const readJSON = require('../lib/utils').readJSON;
const coffee = require('coffee');

const bin = path.join(__dirname, '../bin/install.js');

describe('test/seperate-dependencies.test.js', () => {

  describe('npminstall', function() {
    const root = path.join(__dirname, 'fixtures', 'seperate-dependencies');

    function cleanup() {
      rimraf.sync(path.join(root, 'node_modules'));
    }

    function* checkPkg(name, version) {
      const pkg = yield readJSON(path.join(root, 'node_modules', name, 'package.json'));
      assert.equal(pkg.version, version);
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install all', function* () {
      yield coffee.fork(bin, [], {
        cwd: root,
      }).end();
      yield checkPkg('koa', '1.0.0');
      yield checkPkg('mocha', '3.0.0');
      yield checkPkg('react', '15.0.0');
      yield checkPkg('webpack', '3.0.0');
      yield checkPkg('utility', '1.0.0');
    });

    it('should install production', function* () {
      yield coffee.fork(bin, [ '--production' ], {
        cwd: root,
      }).end();
      yield checkPkg('koa', '1.0.0');
      yield checkPkg('mocha', undefined);
      yield checkPkg('react', undefined);
      yield checkPkg('webpack', undefined);
      yield checkPkg('utility', '1.0.0');
    });

    it('should install client', function* () {
      yield coffee.fork(bin, [ '--client' ], {
        cwd: root,
      }).end();
      yield checkPkg('koa', undefined);
      yield checkPkg('mocha', undefined);
      yield checkPkg('react', '15.0.0');
      yield checkPkg('webpack', '3.0.0');
      yield checkPkg('utility', '1.0.0');
    });
  });
});
