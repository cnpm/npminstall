'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

if (process.platform !== 'win32') {
  describe('test/installLog.test.js', () => {
    const tmp = path.join(__dirname, 'fixtures', 'tmp');

    beforeEach(() => {
      rimraf.sync(tmp);
      mkdirp.sync(tmp);
    });
    afterEach(() => {
      rimraf.sync(tmp);
    });

    it('should install pedding with detail log', done => {
      coffee.fork(npminstall, [
        'pedding',
        '-d',
      ], {
        cwd: tmp,
      })
      .expect('stdout', /pedding@\* installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);
        done();
      });
    });

    it('should install pedding without detail log', done => {
      coffee.fork(npminstall, [
        'pedding',
      ], {
        cwd: tmp,
      })
      .notExpect('stdout', /pedding@\* installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);
        done();
      });
    });
  });
}
