'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const coffee = require('coffee');
const rimraf = require('rimraf');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');
const npmupdate = path.join(__dirname, '..', 'bin', 'update.js');

describe('test/install-ignore-optional.test.js', () => {
  let cwd;
  function cleanup() {
    cwd && rimraf.sync(path.join(cwd, 'node_modules'));
    cwd = null;
  }

  before(() => cleanup());
  after(() => cleanup());

  it('should install ignore optionalDependencies', function* () {
    cwd = path.join(__dirname, 'fixtures', 'ignore-optional');
    yield coffee.fork(npminstall, [ '--no-optional', '--production', '-d' ], { cwd })
      .debug()
      .notExpect('stderr', /optional install error/)
      .notExpect('stderr', /node-gyp rebuild/)
      .expect('stdout', /pinyin@2.8.3 installed/)
      .expect('code', 0)
      .end();
    assert(!fs.existsSync(path.join(cwd, 'node_modules/pinyin/node_modules/nodejieba')));
  });

  it('should update ignore optionalDependencies', function* () {
    cwd = path.join(__dirname, 'fixtures', 'ignore-optional');
    yield coffee.fork(npmupdate, [ '--no-optional', '--production', '-d' ], { cwd })
      .debug()
      .notExpect('stderr', /optional install error/)
      .notExpect('stderr', /node-gyp rebuild/)
      .expect('stdout', /pinyin@2.8.3 installed/)
      .expect('code', 0)
      .end();
    assert(!fs.existsSync(path.join(cwd, 'node_modules/pinyin/node_modules/nodejieba')));
  });
});
