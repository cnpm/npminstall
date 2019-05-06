'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const rimraf = require('mz-modules/rimraf');
const path = require('path');
const coffee = require('coffee');
const helper = require('./helper');

const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/disable-dedupe.test.js', () => {
  const root = helper.fixtures('disable-dedupe');
  const root2 = helper.fixtures('disable-dedupe-config');
  const cleanup = helper.cleanup(root, root2);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install --disable-dedupe work', async () => {
    await coffee.fork(npminstall, [ '--disable-dedupe' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stderr', /disable dedupe mode/)
      .end();
    const names = (await fs.readdir(path.join(root, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length === 1);
    assert(names[0] === 'koa');
  });

  it('should install config.npminstall.disableDedupe=true work', async () => {
    await coffee.fork(npminstall, { cwd: root2 })
      .debug()
      .expect('code', 0)
      .expect('stderr', /disable dedupe mode/)
      .end();
    const names = (await fs.readdir(path.join(root2, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length === 1);
    assert(names[0] === 'koa');
  });

  it('should install config.npminstall[env:production].disableDedupe=true work', async () => {
    const root = path.join(__dirname, 'fixtures', 'disable-dedupe-production-config');
    await rimraf(path.join(root, 'node_modules'));
    await coffee.fork(npminstall, { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stderr', /Linked \d+ latest versions/)
      .end();
    let names = (await fs.readdirSync(path.join(root, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length > 1);

    await rimraf(path.join(root, 'node_modules'));
    await coffee.fork(npminstall, { cwd: root, env: Object.assign({}, process.env, { NODE_ENV: 'production' }) })
      .debug()
      .expect('code', 0)
      // .expect('stderr', /disable dedupe mode/)
      .end();
    names = (await fs.readdir(path.join(root, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length === 1);
    assert(names[0] === 'koa');

    await rimraf(path.join(root, 'node_modules'));
    await coffee.fork(npminstall, [ '--production' ], { cwd: root })
      .debug()
      .expect('code', 0)
      // .expect('stderr', /disable dedupe mode/)
      .end();
    names = (await fs.readdir(path.join(root, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length === 1);
    assert(names[0] === 'koa');
  });

  it('should install config.npminstall[env:development].disableDedupe=true work', async () => {
    const root = path.join(__dirname, 'fixtures', 'disable-dedupe-development-config');
    await rimraf(path.join(root, 'node_modules'));
    await coffee.fork(npminstall, { cwd: root })
      .debug()
      .expect('code', 0)
      // .expect('stderr', /disable dedupe mode/)
      .end();
    let names = (await fs.readdir(path.join(root, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length === 1);
    assert(names[0] === 'koa');

    await rimraf(path.join(root, 'node_modules'));
    await coffee.fork(npminstall, { cwd: root, env: Object.assign({}, process.env, { NODE_ENV: 'production' }) })
      .debug()
      .expect('code', 0)
      // .expect('stderr', /Linked \d+ latest versions/)
      .end();
    names = (await fs.readdir(path.join(root, 'node_modules')))
      .filter(n => !/^[\.\_]/.test(n));
    assert(names.length > 1);
  });
});
