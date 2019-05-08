'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const coffee = require('coffee');
const helper = require('./helper');

const registry = process.env.npm_china ? 'https://registry.npm.taobao.org' : 'https://registry.npmjs.org';

if (process.platform !== 'win32') {
  describe('test/installSaveDeps.test.js', () => {
    const [ tmp, cleanup ] = helper.tmp();

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install --save pedding and update dependencies', done => {
      coffee.fork(helper.npminstall, [
        '--save',
        '-d',
        'pedding',
      ], {
        cwd: tmp,
      })
        .expect('stdout', /pedding@\* installed/)
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
      coffee.fork(helper.npminstall, [
        '--save',
        '-d',
        'pedding',
      ], {
        cwd: tmp,
      })
        .debug()
        .expect('stdout', /pedding@\* installed/)
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);

          const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
          assert(/\{"pedding":"[\^~]\d+\.\d+\.\d+","zhi":"\^0.3.1"\}/.test(JSON.stringify(deps)));

          done();
        });
    });

    it('should install --save-dev pedding and update devDependencies', done => {
      coffee.fork(helper.npminstall, [
        '--save-dev',
        '-d',
        'pedding@0',
      ], {
        cwd: tmp,
      })
        .expect('stdout', /pedding@0 installed/)
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
      coffee.fork(helper.npminstall, [
        '--save-optional',
        '-d',
        'pedding@1',
      ], {
        cwd: tmp,
      })
        .expect('stdout', /pedding@1 installed/)
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

    it('should install --save from remote without name', done => {
      const url = `${registry}/taffydb/-/taffydb-2.7.2.tgz`;
      console.log(url);
      coffee.fork(helper.npminstall, [
        '--save',
        url,
      ], {
        cwd: tmp,
      })
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);
          const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
          assert(deps);
          assert(deps.taffydb === url);
          done();
        });
    });

    it('should install --save from remote with name', done => {
      const url = `${registry}/taffydb/-/taffydb-2.7.2.tgz`;
      console.log(url);
      coffee.fork(helper.npminstall, [
        '--save',
        url,
      ], {
        cwd: tmp,
      })
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);
          const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
          assert(deps);
          assert(deps.taffydb === url);
          done();
        });
    });

    it('should install from github with commit hash mozilla/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09 and update dependencies', done => {
      coffee.fork(helper.npminstall, [
        '--save',
        '-d',
        'mozilla/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09',
      ], {
        cwd: tmp,
      })
        .expect('stdout', /nunjucks@mozilla\/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09 installed/)
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
