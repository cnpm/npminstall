'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const fs = require('mz/fs');
const npmlink = path.join(__dirname, '../bin/link.js');

describe('test/link-folder.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'link-demo');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(path.join(root, 'linked-package/node_modules'));
    rimraf.sync(path.join(root, 'linked-package-2/node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should link one folder work', function* () {
    yield coffee.fork(npmlink, [ './linked-package' ], {
      cwd: root,
    })
    .debug()
    .expect('stderr', /npm_rootpath:.+link\-demo!!!!!/)
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/linked-package')));
  });

  it('should link two folder work', function* () {
    yield coffee.fork(npmlink, [ './linked-package', './linked-package-2', '-d' ], {
      cwd: root,
    })
    .debug()
    .end();

    assert(fs.existsSync(path.join(root, 'node_modules/linked-package')));
    assert(fs.existsSync(path.join(root, 'node_modules/linked-package-2')));
    // bin file should be exists
    assert(fs.existsSync(path.join(root, 'node_modules/.bin/linked-package-2')));
  });
});
