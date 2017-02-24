'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const fs = require('mz/fs');
const npmlink = path.join(__dirname, '../bin/link.js');

describe('test/link-to-global.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'link-demo');
  const prefix = path.join(__dirname, 'fixtures', 'npm-global');
  const libDir = process.platform === 'win32' ? prefix : path.join(prefix, 'lib');
  const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');

  function cleanup() {
    rimraf.sync(path.join(prefix, 'node_modules'));
    rimraf.sync(path.join(root, 'linked-package/node_modules'));
    rimraf.sync(path.join(root, 'linked-package-2/node_modules'));
    rimraf.sync(libDir);
    rimraf.sync(binDir);
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should link without bin', function* () {
    yield coffee.fork(npmlink, [ `--prefix=${prefix}` ], {
      cwd: path.join(root, 'linked-package'),
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(libDir, 'node_modules/linked-package')));
  });

  it('should link with bin', function* () {
    yield coffee.fork(npmlink, [ `--prefix=${prefix}` ], {
      cwd: path.join(root, 'linked-package-2'),
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(libDir, 'node_modules/linked-package-2')));
    // bin file should be exists
    assert(fs.existsSync(path.join(binDir, 'linked-package-2')));
  });
});
