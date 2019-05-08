'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const semver = require('semver');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/bundleDependencies.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install node-pre-gyp@0.6.19', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'node-pre-gyp', version: '0.6.19' },
      ],
    });
    const pkg = await helper.readJSON(path.join(tmp, 'node_modules', 'node-pre-gyp', 'package.json'));
    assert.equal(pkg.name, 'node-pre-gyp');
    assert.equal(pkg.version, '0.6.19');

    // only node-pre-gyp dir exists
    const dirs = await fs.readdir(path.join(tmp, 'node_modules/'));
    assert.deepEqual(dirs.sort(), [ '.bin', '_node-pre-gyp@0.6.19@node-pre-gyp', 'node-pre-gyp' ].sort());
  });

  it('should install bundleDependencies not exist(nyc@6.4.2)', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'nyc', version: '6.4.2' },
      ],
    });
    const exists = await fs.exists(path.join(tmp, 'node_modules/nyc/node_modules/foreground-child'));
    assert(exists);
  });

  if (semver.satisfies(process.version, '< 12.0.0')) {
    it('should link bundleDependencies bin', async () => {
      await npminstall({
        root: tmp,
        pkgs: [{
          name: 'sqlite3',
          version: '^4.0.6',
          // version: '3.1.3',
        }],
      });
      const bins = await fs.readdir(path.join(tmp, 'node_modules/sqlite3/node_modules/.bin'));
      if (process.platform === 'win32') {
        assert.deepEqual(bins, [ 'node-pre-gyp', 'node-pre-gyp.cmd' ]);
      } else {
        assert.deepEqual(bins, [ 'node-pre-gyp' ]);
      }
    });
  }
});
