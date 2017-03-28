'use strict';

const assert = require('assert');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');
const bin = path.join(__dirname, '../bin/install.js');
const coffee = require('coffee');

describe('test/postInstallError.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should display error when post install', function* () {
    let throwError = false;
    try {
      yield npminstall({
        root: tmp,
        pkgs: [
          { name: 'install-error', version: '1.0.0' },
        ],
      });
    } catch (err) {
      assert(err.message.indexOf('post install error, please remove node_modules before retry!') >= 0);
      throwError = true;
    }
    assert.equal(throwError, true);
  });

  it('should ignore optional post install error', function* () {
    const root = path.join(__dirname, 'fixtures', 'optional-dep-postinstall');
    rimraf.sync(path.join(root, 'node_modules'));

    yield coffee.fork(bin, [ '--production' ], { cwd: root })
      .debug()
      .expect('code', 0)
      .expect('stderr', /httpsync@\* optional error: Error: Run ".*?build\.sh" error/)
      .expect('stdout', /\[1\/2\] scripts.install httpsync@\* run "sh build.sh"/)
      .expect('stdout', /\[2\/2\] scripts.install pinyin@/)
      .expect('stdout', /All packages installed/)
      .end();
  });
});
