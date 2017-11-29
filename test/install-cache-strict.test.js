'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '../bin/install.js');

describe('test/install-cache-strict.test.js', () => {
  // Fixme: mock Windows homedir
  if (process.platform === 'win32') return;

  const homedir = path.join(__dirname, 'fixtures', '.tmp');
  const demo = path.join(__dirname, 'fixtures', 'demo');

  function cleanup() {
    rimraf.sync(path.join(demo, 'node_modules'));
    rimraf.sync(path.join(demo, '.npm_cache'))
    rimraf.sync(homedir);
  }

  beforeEach(() => {
    cleanup();
    fs.mkdir(homedir);
  });
  afterEach(cleanup);

  it('should read disk cache on --cache-strict --production', function* () {
    yield coffee.fork(npminstall, [ '--cache-strict', '--production' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(homedir, '.npminstall_tarball/d/e/b/u/debug')));
  });

  it('should read disk cache on --cache-strict NODE_ENV=production', function* () {
    yield coffee.fork(npminstall, [ '--cache-strict' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
        NODE_ENV: 'production',
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(homedir, '.npminstall_tarball/d/e/b/u/debug')));
  });

  it('should read disk cache from custimize direcotry on --cache=~/.npm_cache', function* () {
    yield coffee.fork(npminstall, [ '--cache=~/.npm_cache' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(homedir, '.npm_cache/d/e/b/u/debug')));
  });

  it('should read disk cache from customize direcotry on --cache=~/.npm_cache', function* () {
    yield coffee.fork(npminstall, [ '--cache=~/.npm_cache' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(homedir, '.npm_cache/d/e/b/u/debug')));
  });

  it('should read disk cache from customize directory on --cache=.npm_cache', function* () {
    yield coffee.fork(npminstall, [ '--cache=.npm_cache' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(demo, '.npm_cache/d/e/b/u/debug')));
  });

  it('should read disk cache from customize directory on absolute path', function* () {
    const absolutePath = path.join(homedir, '.npm_cache');
    yield coffee.fork(npminstall, [ `--cache=${absolutePath}` ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(absolutePath, 'd/e/b/u/debug')));
  });

  it('should read disk cache from customize directroy on --cache=../.tmp/.npm_cache', function* () {
    yield coffee.fork(npminstall, [ `--cache=../.tmp/.npm_cache` ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir
      }),
    })
    .debug()
    .end();

    assert(fs.statSync(path.join(homedir, '.npm_cache/d/e/b/u/debug')));
  });

  it('should read disk cache from customize directory on --cache-strict --production --cache=~/.npm_cache', function* () {
    yield coffee.fork(npminstall, [ '--cache=~/.npm_cache', '--production', '--cache-strict' ], {
      cwd: demo,
      env: Object.assign({}, process.env, {
        HOME: homedir,
      }),
    })
    .debug()
    .end();
    assert(fs.statSync(path.join(homedir, '.npm_cache/d/e/b/u/debug')));
  });

});
