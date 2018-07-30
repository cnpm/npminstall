'use strict';

const path = require('path');
const coffee = require('coffee');
const rimraf = require('rimraf');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/install-production.test.js', () => {
  function cleanup(cwd) {
    rimraf.sync(path.join(cwd, 'node_modules', '.package_versions.json'));
  }

  describe('warn-node-modules-exists', () => {
    const cwd = path.join(__dirname, 'fixtures', 'warn-node-modules-exists');
    before(() => cleanup(cwd));
    after(() => cleanup(cwd));

    it('should warning node_modules exists on production', () => {
      return coffee.fork(npminstall, [ '--production' ], { cwd })
        .debug()
        .expect('code', 0)
        .expect('stderr', /npminstall WARN node_modules exists/)
        .expect('stderr', /contains 1 dirs/)
        .end();
    });
  });

  describe('ignore-warn-node-modules-exists', () => {
    const cwd = path.join(__dirname, 'fixtures', 'ignore-warn-node-modules-exists');
    before(() => cleanup(cwd));
    after(() => cleanup(cwd));

    it('should ignore [ .bin, node ] node_modules', () => {
      return coffee.fork(npminstall, [ '--production' ], { cwd })
        .debug()
        .expect('code', 0)
        .notExpect('stderr', /npminstall WARN node_modules exists/)
        .end();
    });
  });
});
