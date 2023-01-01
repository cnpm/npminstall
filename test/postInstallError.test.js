const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const helper = require('./helper');
const npminstall = require('./npminstall');
const { rimraf } = require('../lib/utils');

describe('test/postInstallError.test.js', () => {
  const [ root, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should display error when post install', async () => {
    let throwError = false;
    try {
      await npminstall({
        root,
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

  it('should ignore optional post install error', async () => {
    const cwd = helper.fixtures('optional-dep-postinstall');
    await rimraf(path.join(cwd, 'node_modules'));

    await coffee.fork(helper.npminstall, [ '--production' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stderr', /httpsync@\* optional error: .*Error: Run ".*?build\.sh" error/)
      .expect('stderr', /scripts.install httpsync@\* run "sh build.sh"/)
      .expect('stdout', /All packages installed/)
      .end();
  });
});
