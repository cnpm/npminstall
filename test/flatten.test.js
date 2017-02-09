'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('use-exists-version.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'flatten');
  const bin = path.join(__dirname, '../bin/install.js');

  function getPkg(subPath) {
    return JSON.parse(fs.readFileSync(path.join(tmp, subPath)));
  }

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(cleanup);

  it('should force all koa to 1.1.0', function* () {
    yield coffee.fork(bin, [ '-d', '--flatten', './mod1' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(getPkg('node_modules/mod1/node_modules/koa/package.json').version === '1.1.0');
    assert(getPkg('node_modules/mod1/node_modules/mod2/node_modules/koa/package.json').version === '1.1.0');
    assert(getPkg('node_modules/mod1/node_modules/mod3/node_modules/koa/package.json').version === '1.1.0');
    assert(getPkg('node_modules/mod1/node_modules/mod4/node_modules/koa/package.json').version === '0.10.0');
  });

  it('should force all koa to ~1.1.2', function* () {
    yield coffee.fork(bin, [ '-d', '--flatten', './mod2' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(getPkg('node_modules/mod2/node_modules/koa/package.json').version === '1.1.2');
    assert(getPkg('node_modules/mod2/node_modules/mod3/node_modules/koa/package.json').version === '1.1.2');
    assert(getPkg('node_modules/mod2/node_modules/mod4/node_modules/koa/package.json').version === '0.10.0');
  });

  it('should not force koa version without flatten', function* () {
    yield coffee.fork(bin, [ '-d', './mod1' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(getPkg('node_modules/mod1/node_modules/koa/package.json').version === '1.1.0');
    assert(getPkg('node_modules/mod1/node_modules/mod2/node_modules/koa/package.json').version === '1.1.2');
    assert(getPkg('node_modules/mod1/node_modules/mod3/node_modules/koa/package.json').version !== '1.1.0');
    assert(getPkg('node_modules/mod1/node_modules/mod4/node_modules/koa/package.json').version === '0.10.0');
  });

  it('should use first debug@2.2.0', function* () {
    yield coffee.fork(bin, [ '-d', '--flatten', './mod5' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(getPkg('node_modules/mod5/node_modules/mod6/node_modules/mod7/node_modules/debug/package.json').version === '2.2.0');
  });

  it('should not use first debug@2.2.0 without flatten flag', function* () {
    yield coffee.fork(bin, [ '-d', './mod5' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    assert(getPkg('node_modules/mod5/node_modules/mod6/node_modules/mod7/node_modules/debug/package.json').version !== '2.2.0');
  });
});
