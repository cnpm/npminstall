'use strict';

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const coffee = require('coffee');
const helper = require('./helper');

describe('test/installGlobal.test.js', () => {
  const registry = process.env.npm_registry || 'https://r.cnpmjs.org';
  const [ tmp, cleanup ] = helper.tmp();

  let binDir = path.join(tmp, 'bin');
  let libDir = path.join(tmp, 'lib');
  if (process.platform === 'win32') {
    binDir = tmp;
    libDir = tmp;
  }

  beforeEach(cleanup);
  afterEach(cleanup);
  it('should global install work', async () => {
    await coffee.fork(helper.npminstall, [
      `--prefix=${tmp}`,
      '-g',
      'contributors',
      `${registry}/pedding/-/pedding-1.0.0.tgz`,
      `${registry}/taffydb/-/taffydb-2.7.2.tgz`,
      `${registry}/egg-bin/-/egg-bin-1.6.0.tgz`,
    ])
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();

    assert(await fs.exists(path.join(binDir, 'contributors')));
    assert(await fs.exists(path.join(binDir, 'egg-bin')));
    assert(await fs.exists(path.join(libDir, 'node_modules/contributors')));
    assert(await fs.exists(path.join(libDir, 'node_modules/taffydb')));
    assert(await fs.exists(path.join(libDir, 'node_modules/pedding')));
    assert(await fs.exists(path.join(libDir, 'node_modules/egg-bin')));
    assert(!(await fs.exists(path.join(libDir, 'node_modules/.contributors_npminstall/node_modules'))));

    await coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'contributors',
      'b',
      `${registry}/egg-bin/-/egg-bin-1.7.0.tgz`,
    ])
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();

    assert(await fs.exists(path.join(binDir, 'contributors')));
    assert(await fs.exists(path.join(binDir, 'egg-bin')));
    assert(await fs.exists(path.join(binDir, 'mocha')));
    assert(await fs.exists(path.join(libDir, 'node_modules/contributors')));
    assert(await fs.exists(path.join(libDir, 'node_modules/b')));
    assert(await fs.exists(path.join(libDir, 'node_modules/egg-bin')));

    await coffee.fork(require.resolve('../bin/install.js'), [
      `--prefix=${tmp}`,
      '-g',
      'contributors@0',
    ])
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();

    assert(await fs.exists(path.join(binDir, 'contributors')));
    assert(await fs.exists(path.join(libDir, 'node_modules/contributors')));
  });

  it('should install with global prefix', async () => {
    await coffee.fork(helper.npminstall, [
      `--prefix=${tmp}`,
      '-g',
      'egg-bin',
    ])
      .debug()
      .expect('stdout', /Downloading egg-bin to /)
      .expect('stdout', /Installing egg-bin's dependencies to /)
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();

    assert(await fs.exists(path.join(binDir, 'egg-bin')));
    assert(await fs.exists(path.join(binDir, 'mocha')));
    assert(await fs.exists(path.join(libDir, 'node_modules/egg-bin')));
    assert((await fs.stat(path.join(libDir, 'node_modules/egg-bin'))).isDirectory());
  });
});
