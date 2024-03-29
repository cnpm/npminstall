const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const assertFile = require('assert-file');
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
    const dirs = await fs.readdir(path.join(tmp, 'node_modules'));
    assert.deepEqual(dirs.sort(), [ '.bin', '.store', 'node-pre-gyp' ].sort());
  });

  it('should install bundleDependencies not exist(nyc@6.4.2)', async () => {
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'nyc', version: '6.4.2' },
      ],
    });
    assertFile(path.join(tmp, 'node_modules/nyc'));
    assertFile.fail(path.join(tmp, 'node_modules/.store/node_modules/nyc'));
    assertFile(path.join(tmp, 'node_modules/.store/nyc@6.4.2/node_modules/nyc'));
    assertFile(path.join(tmp, 'node_modules/.store/nyc@6.4.2/node_modules/foreground-child'));
    assertFile(path.join(tmp, 'node_modules/.store/node_modules'));
    assertFile(path.join(tmp, 'node_modules/.store/node_modules/glob'));
  });
});
