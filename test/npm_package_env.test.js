'use strict';

const assert = require('assert');
const rimraf = require('rimraf');
const path = require('path');
const coffee = require('coffee');
const pkg = require('../package.json');
const helper = require('./helper');
const readJSON = require('../lib/utils').readJSON;

describe('test/npm_package_env.test.js', () => {
  const root = path.join(__dirname, 'fixtures', 'npm_package_env');

  function cleanup() {
    rimraf.sync(path.join(root, 'node_modules'));
    rimraf.sync(path.join(root, '.tmp_*'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should set npm_package_* env on preinstall, postinstall', function* () {
    yield coffee.fork(helper.npminstall, [], {
      cwd: root,
    })
      .debug()
      .expect('code', 0)
      .end();
    const preinstallEnv = yield readJSON(path.join(root, '.tmp_preinstall'));
    assert(preinstallEnv.npm_package_engines_node === '~0.10.0 || ~0.12.0 || ^4.2.0');
    assert(preinstallEnv.npm_package_engines_foo_bar_0 === '1111');
    assert(preinstallEnv.npm_package_greenkeeper_ignore_0 === 'glob');
    assert(preinstallEnv.npm_package_greenkeeper_ignore_4 === 'showdown-ghost');
    const postinstallEnv = yield readJSON(path.join(root, '.tmp_postinstall'));
    assert(postinstallEnv.npm_package_engines_node === '~0.10.0 || ~0.12.0 || ^4.2.0');
    assert(postinstallEnv.npm_package_engines_foo_bar_0 === '1111');
    assert(postinstallEnv.npm_package_greenkeeper_ignore_0 === 'glob');
    assert(postinstallEnv.npm_package_greenkeeper_ignore_4 === 'showdown-ghost');
    assert(postinstallEnv.npm_config_user_agent === `npminstall/${pkg.version} npm/? node/${process.version} ${process.platform} ${process.arch}`);
  });
});
