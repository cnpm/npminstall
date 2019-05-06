'use strict';

const path = require('path');
const coffee = require('coffee');
const rimraf = require('mz-modules/rimraf');
const helper = require('./helper');

describe('test/install-production.test.js', () => {
  async function cleanup(cwd) {
    await rimraf(path.join(cwd, 'node_modules', '.package_versions.json'));
  }

  describe('warn-node-modules-exists', () => {
    const cwd = helper.fixtures('warn-node-modules-exists');
    before(() => cleanup(cwd));
    after(() => cleanup(cwd));

    it('should warning node_modules exists on production', () => {
      return coffee.fork(helper.npminstall, [ '--production' ], { cwd })
        .debug()
        .expect('code', 0)
        .expect('stderr', /npminstall WARN node_modules exists/)
        .expect('stderr', /contains 1 dirs/)
        .end();
    });
  });

  describe('ignore-warn-node-modules-exists', () => {
    const cwd = helper.fixtures('ignore-warn-node-modules-exists');
    before(() => cleanup(cwd));
    after(() => cleanup(cwd));

    it('should ignore [ .bin, node ] node_modules', () => {
      return coffee.fork(helper.npminstall, [ '--production' ], { cwd })
        .debug()
        .expect('code', 0)
        .notExpect('stderr', /npminstall WARN node_modules exists/)
        .end();
    });
  });
});
