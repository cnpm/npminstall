'use strict';

const assert = require('power-assert');
const fs = require('fs');
const spawn = require('cross-spawn');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const runscript = require('runscript');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../../../packages/npminstall/bin/install.js');
const npmuninstall = path.join(__dirname, '../../../packages/npminstall/bin/uninstall.js');
const link = path.join(__dirname, '../../../packages/npminstall/bin/link.js');
const fixtures = path.join(__dirname, 'fixtures');

describe('test/npminstall.test.js', () => {
  const tmpcwd = path.join(__dirname, 'fixtures', 'tmppackage');
  let cwd;
  let cache;
  mkdirp(tmpcwd);

  afterEach(function() {
    rimraf.sync(path.join(tmpcwd, 'node_modules'));
    if (cwd) {
      rimraf.sync(path.join(cwd, 'node_modules'));
      if (cache) {
        rimraf.sync(path.join(cache));
        cache = undefined;
      }
      cwd = undefined;
    }
  });

  it.skip('should install phantomjs-1.9 work on npminstall mode without TEMP env', done => {
    cwd = path.join(__dirname, 'fixtures', 'phantomjs-1.9');
    const env = {};
    for (const key in process.env) {
      env[key] = process.env[key];
    }
    env.TEMP = '';
    env.TMPDIR = '';

    coffee
      .fork(npminstall, { cwd, env })
      .debug()
      .expect('code', 0)
      .end(done);
  });

  it('should show version', done => {
    coffee
      .fork(npminstall, [ '-v' ], { cwd: tmpcwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /npminstall/)
      .end(done);
  });

  it('should install koa', done => {
    coffee
      .fork(npminstall, [ 'koa' ], { cwd: tmpcwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(!err);
        assert(fs.existsSync(path.join(tmpcwd, 'node_modules/koa/package.json')));
        done();
      });
  });

  it.skip('should install co', done => {
    coffee
      .fork(npminstall, [ 'co' ], { cwd: tmpcwd })
      .debug()
      .expect('code', 0)
      .end(done);
  });

  it.skip('should install node-murmurhash', done => {
    coffee
      .fork(npminstall, [ 'node-murmurhash' ], { cwd: tmpcwd })
      .debug()
      .expect('code', 0)
      .end(done);
  });

  if (process.platform === 'darwin') {
    it.skip('should install fsevents binary from mirror', done => {
      cwd = path.join(fixtures, 'fsevents-install');

      coffee
        .fork(npminstall, [ '--loglevel=http' ], { cwd })
        .debug()
        .expect('code', 0)
        .end(err => {
          assert(err == null);
          assert(fs.existsSync(path.join(cwd, 'node_modules/fsevents')));
          done();
        });
    });

    it.skip('should install sqlite3 binary from mirror', done => {
      cwd = path.join(fixtures, 'sqlite3-install');

      coffee
        .fork(npminstall, [ '--loglevel=http' ], { cwd })
        .debug()
        .expect('code', 0)
        .end(err => {
          assert(err == null);
          assert(fs.existsSync(path.join(cwd, 'node_modules/sqlite3')));
          assert(fs.existsSync(path.join(cwd, 'node_modules/sqlite3/lib/binding/node-v64-darwin-x64/node_sqlite3.node')));
          done();
        });
    });
  }

  it('should install without package.json', done => {
    cwd = path.join(fixtures, 'no_package');

    coffee
      .fork(npminstall, { cwd })
      .debug()
      .expect('code', 0)
      .end(done);
  });

  it('should show manual when no subcommand present', done => {
    cwd = path.join(fixtures, 'no_package');

    coffee
      .fork(npminstall, [ '--by=yarn' ], { cwd })
      .debug()
      .expect('code', 0)
      .end(done);
  });

  it.skip('should install chromedriver', done => {
    cwd = path.join(fixtures, 'chromedriver-install');

    coffee
      .fork(npminstall, { cwd })
      .debug()
      .expect('code', 0)
      .end(done);
  });

  it.skip('should install chokidar', done => {
    cwd = path.join(fixtures, 'chokidar-install');

    coffee
      .fork(npminstall, { cwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(err == null);
        // 确保 fsevents 不会被安装
        assert(!fs.existsSync(path.join(cwd, 'node_modules/chokidar/node_modules/fsevents')));
        assert(!fs.existsSync(path.join(cwd, 'node_modules/fsevents')));
        done();
      });
  });

  it('should install less', done => {
    cwd = path.join(fixtures, 'less-install');

    coffee
      .fork(npminstall, { cwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(err == null);
        assert(fs.existsSync(path.join(cwd, 'node_modules/less')));
        done();
      });
  });

  it.skip('should install node-sass@4 binary from mirror', done => {
    cwd = path.join(fixtures, 'node-sass-install');

    coffee
      .fork(npminstall, { cwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(err == null);
        assert(fs.existsSync(path.join(cwd, 'node_modules/node-sass')));
        done();
      });
  });

  it('should install npminstall itself', done => {
    coffee
      .fork(npminstall, [ 'npminstall' ], { cwd: tmpcwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(!err);
        assert(fs.existsSync(path.join(tmpcwd, 'node_modules/npminstall')));
        done();
      });
  });

  it('should install babel-core', done => {
    cwd = path.join(fixtures, 'tnpm-install');

    coffee
      .fork(npminstall, [ 'babel-core' ], { cwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(err == null);
        assert(fs.existsSync(path.join(cwd, 'node_modules/babel-core')));
        done();
      });
  });

  it('should use npminstall through tnpm config mode=npminstall', done => {
    cwd = path.join(fixtures, 'tnpm-config');

    coffee
      .fork(npminstall, { cwd })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(err == null);
        assert(fs.existsSync(path.join(cwd, 'node_modules/pedding/package.json')));
        assert(fs.existsSync(path.join(cwd, 'node_modules/_pedding@1.0.0@pedding')));
        done();
      });
  });

  it('should not pass --cache-strict to npminstall when running in CI', done => {
    cwd = path.join(fixtures, 'tnpmrc-cachestrict');
    cache = path.join(cwd, '.npminstall_tarball');

    const env = Object.create(process.env);
    env.USERPROFILE = cwd;
    env.HOME = cwd;
    env.CI = true;

    coffee
      .fork(npminstall, [ '--production' ], { cwd, env })
      .debug()
      .expect('code', 0)
      .end(err => {
        assert(err == null);
        assert(!fs.existsSync(path.join(cache, 'p')));
        done();
      });

  });

  describe('installation pass env', () => {
    const cwd = path.join(fixtures, 'install-with-env');
    beforeEach(() => {
      rimraf.sync(path.join(cwd, 'node_modules'));
    });
    afterEach(() => {
      rimraf.sync(path.join(cwd, 'node_modules'));
    });
    it('should install success when in npminstall mode', done => {
      coffee.fork(npminstall, [
        '-a',
        '--aone_env_type=PROD',
        '--aone_schema',
        'a',
      ], { cwd })
        .debug()
        .expect('code', 0)
        .expect('stdout', /aone_env_type: {2}PROD\naone_schema: {2}a/)
        .end(done);
    });
    it('should install success when in npminstall mode with customized bool arg', done => {
      coffee.fork(npminstall, [
        '--deps-tree',
        '--aone_env_type=PROD',
        '--aone_schema',
        'a',
      ], { cwd })
        .debug()
        .expect('code', 0)
        .expect('stdout', /aone_env_type: {2}PROD\naone_schema: {2}a/)
        .end(done);
    });
    it('should install success when in npm mode', done => {
      coffee.fork(npminstall, [
        '--by=npm',
        '-a',
        // ci 都是用 root 账户跑，这里有 postinstall 脚本，所以需要指定 --unsafe-perm
        '--unsafe-perm=true',
        '--aone_env_type=PROD',
        '--aone_schema=a',
      ], { cwd })
        .debug()
        .expect('code', 0)
        .expect('stdout', /aone_env_type: {2}PROD\naone_schema: {2}a/)
        .end(done);
    });

    it('should install success when in yarn mode', done => {
      coffee.fork(npminstall, [
        '--by=yarn',
        '-a',
      ], { cwd })
        .debug()
        .expect('code', 0)
        .end(done);
    });
  });

  describe.skip('uninstall with npminstall', () => {
    it('should uninstall npminstall ok', done => {
      let args = [ npminstall, 'i', './pkg' ];
      const cwd = path.join(fixtures, 'uninstall');
      spawn('node', args, {
        cwd,
      }).on('exit', code => {
        assert(code === 0);
        args = [ npmuninstall, 'pkg@1.0.0' ];
        spawn('node', args, { cwd }).on('exit', code => {
          assert(code === 0);
          assert(!fs.existsSync(path.join(fixtures, 'uninstall/node_modules/pkg')));
          assert(!fs.existsSync(path.join(fixtures, 'uninstall/node_modules/_pkg@1.0.0')));
          rimraf.sync(path.join(fixtures, 'uninstall/node_modules'));
          done();
        });
      });
    });

    it('should uninstall normal install ok', done => {
      let args = [ npminstall, './pkg' ];
      const cwd = path.join(fixtures, 'uninstall');
      spawn('node', args, {
        cwd,
      }).on('exit', code => {
        assert(code === 0);
        args = [ npmuninstall, 'pkg@1.0.0' ];
        spawn('node', args, { cwd }).on('exit', code => {
          assert(code === 0);
          assert(!fs.existsSync(path.join(fixtures, 'uninstall/node_modules/pkg')));
          rimraf.sync(path.join(fixtures, 'uninstall/node_modules'));
          done();
        });
      });
    });
  });
});
