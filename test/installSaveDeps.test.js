'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const coffee = require('coffee');
const helper = require('./helper');

const registry = process.env.npm_china ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.com';

if (process.platform !== 'win32') {
  describe('test/installSaveDeps.test.js', () => {
    const [ tmp, cleanup ] = helper.tmp();

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should install saves any specified packages into dependencies by default', done => {
      coffee.fork(helper.npminstall, [
        'pedding',
      ], {
        cwd: tmp,
      })
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);

          const deps = require(path.join(tmp, 'package.json')).dependencies;
          assert(deps);
          assert(deps.pedding);
          assert.equal(typeof deps.pedding, 'string');
          assert(/^[\^~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

          done();
        });
    });

    it('should install --no-save prevent saving to dependencies', done => {
      coffee.fork(helper.npminstall, [
        'pedding',
      ], {
        cwd: tmp,
      })
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);

          const deps = require(path.join(tmp, 'package.json')).dependencies;
          assert(deps);
          assert(deps.pedding);
          assert.equal(typeof deps.pedding, 'string');
          assert(/^[\^~]{1}\d+\.\d+\.\d+/.test(deps.pedding), deps.pedding);

          coffee.fork(helper.npminstall, [
            'nunjucks',
            '--no-save',
          ], {
            cwd: tmp,
          })
            .expect('code', 0)
            .end(err => {
              assert(!err, err && err.message);

              const deps = require(path.join(tmp, 'package.json')).dependencies;
              assert.equal(Object.keys(deps).length, 1);
              assert.equal(typeof deps.pedding1, 'undefined');

              done();
            });

        });
    });

    it('should install --save pedding and update dependencies', done => {
      coffee.fork(helper.npminstall, [
        '--save',
        '-d',
        'pedding',
      ], {
        cwd: tmp,
      })
        .expect('stdout', /pedding@latest installed/)
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
        .expect('stdout', /pedding@latest installed/)
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

    it('should install --save alias and update dependencies', done => {
      coffee.fork(helper.npminstall, [
        '--save',
        'lodash-has-v3@npm:lodash.has@^3',
        'lodash-has-v4@npm:lodash.has@^4',
      ], {
        cwd: tmp,
      })
      // .debug()
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);
          const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
          const lodashHashV3 = JSON.parse(fs.readFileSync(path.join(tmp, 'node_modules/lodash-has-v3', 'package.json')));
          const lodashHashV4 = JSON.parse(fs.readFileSync(path.join(tmp, 'node_modules/lodash-has-v4', 'package.json')));

          assert(deps);
          assert.strictEqual(deps['lodash-has-v3'], 'npm:lodash.has@^3');
          assert.strictEqual(deps['lodash-has-v4'], 'npm:lodash.has@^4');
          assert(/^3\.\d+\.\d+$/.test(lodashHashV3.version));
          assert.strictEqual(lodashHashV3.name, 'lodash.has');
          assert(/^4\.\d+\.\d+$/.test(lodashHashV4.version));
          assert.strictEqual(lodashHashV4.name, 'lodash.has');
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

    it('install with dist-tag should update dependencies with tag', done => {
      coffee.fork(helper.npminstall, [
        'pedding@latest',
      ], {
        cwd: tmp,
      })
        .expect('code', 0)
        .end(err => {
          assert(!err, err && err.message);
          const deps = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'))).dependencies;
          assert(deps);
          assert(deps.pedding === 'latest');
          done();
        });
    });
  });
}
