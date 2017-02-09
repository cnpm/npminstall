'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const path = require('path');
const assert = require('assert');

describe.only('use-exists-version.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'try-to-use-one-version');
  const bin = path.join(__dirname, '../bin/install.js');

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(cleanup);

  it('should replace tarball url to other', function* () {
    yield coffee.fork(bin, [ '-d', '--flatten' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    const pkg = require(path.join(tmp, 'node_modules/@types/react-dom/node_modules/@types/react/package.json'));
    assert(pkg.version === '15.0.4');
  });
});
