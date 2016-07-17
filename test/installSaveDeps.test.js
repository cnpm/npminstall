'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('mz/fs');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

if (process.platform !== 'win32') {
  describe('test/installSaveDeps.test.js', () => {
    const tmp = path.join(__dirname, 'fixtures', 'tmp');

    beforeEach(() => {
      rimraf.sync(tmp);
      mkdirp.sync(tmp);
    });
    afterEach(() => {
      rimraf.sync(tmp);
    });

    it('should install --save pedding and update dependencies', done => {
      coffee.fork(npminstall, [
        '--save',
        'pedding',
      ], {
        cwd: tmp,
      })
      .expect('stdout', /\[pedding@\*\] installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);

        const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
        assert(deps);
        assert(deps.pedding);
        assert.equal(typeof deps.pedding, 'string');
        assert(/^[\^~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

        done();
      });
    });

    it('should install --save pedding and update dependencies and sort', done => {
      fs.writeFileSync(path.join(tmp, 'package.json'), '{"dependencies":{"zhi":"^0.3.1"}}');
      coffee.fork(npminstall, [
        '--save',
        'pedding',
      ], {
        cwd: tmp,
      })
      .debug()
      .expect('stdout', /\[pedding@\*\] installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);

        const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
        assert(/\{"pedding":"[\^~]\d+\.\d+\.\d+","zhi":"\^0.3.1"\}/.test(JSON.stringify(deps)));

        done();
      });
    });

    it('should install --save-dev pedding and update devDependencies', done => {
      coffee.fork(npminstall, [
        '--save-dev',
        'pedding@0',
      ], {
        cwd: tmp,
      })
      .expect('stdout', /\[pedding@0\] installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);
        const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).devDependencies;
        assert(deps);
        assert(deps.pedding);
        assert.equal(typeof deps.pedding, 'string');
        assert(/^[\^~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

        done();
      });
    });

    it('should install --save-optional pedding and update optionalDependencies', done => {
      coffee.fork(npminstall, [
        '--save-optional',
        'pedding@1',
      ], {
        cwd: tmp,
      })
      .expect('stdout', /\[pedding@1\] installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);
        const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).optionalDependencies;
        assert(deps);
        assert(deps.pedding);
        assert.equal(typeof deps.pedding, 'string');
        assert(/^[\^~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

        done();
      });
    });

    it('should install from github with commit hash mozilla/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09 and update dependencies', done => {
      coffee.fork(npminstall, [
        '--save',
        'mozilla/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09',
      ], {
        cwd: tmp,
      })
      .expect('stdout', /\[nunjucks@mozilla\/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09\] installed/)
      .expect('code', 0)
      .end(err => {
        assert(!err, err && err.message);
        const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
        assert(deps);
        assert(deps.nunjucks);
        assert.equal(typeof deps.nunjucks, 'string');
        assert.equal(deps.nunjucks, 'mozilla/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09');

        done();
      });
    });
  });
}
