'use strict';

const path = require('path');
const rimraf = require('rimraf');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');
const coffee = require('coffee');

describe('test/license.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'forbidden-license');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install forbidden license error', done => {
    coffee.fork(npminstall, [
      '--forbidden-licenses=mit,sic',
      './forbidden',
    ], {
      cwd: root,
    })
    .expect('stderr', /!!!WARNING!!! license forbidden: package forbidden's license\(MIT-v3\.0\) is not allowed/)
    .end(done);
  });

  it('should install none / allowed license ok', done => {
    coffee.fork(npminstall, [
      '--forbidden-licenses=mit,sic',
      './allow',
      './none',
    ], {
      cwd: root,
    })
    .expect('stdout', /2 packages installed from local file/)
    .end(done);
  });
});
