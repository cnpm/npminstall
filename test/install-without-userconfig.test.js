'use strict';

const path = require('path');
const rimraf = require('rimraf');
const coffee = require('coffee');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

const cwd = path.join(__dirname, './fixtures/initial-cnpmrc/');

describe('test/install-without-userconfig.test.js', () => {
  it('should run cnpm install successfully without cnpmrc userconfig', function* () {
    function cleanup() {
      rimraf.sync(path.join(cwd, 'node_modules'));
    }

    beforeEach(cleanup);
    afterEach(cleanup);

    yield coffee.fork(npminstall, [ 'webpack-parallel-uglify-plugin@1.0.0' ], {
      cwd,
      env: Object.assign({}, process.env, {
        USERPROFILE: cwd,
        HOME: cwd,
      }),
    })
      .debug()
      .expect('code', 0)
      .end();
  });
});
