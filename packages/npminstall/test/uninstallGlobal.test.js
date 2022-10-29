'use strict';

const coffee = require('coffee');
const helper = require('./helper');

describe('test/uninstallGlobal.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should uninstall with global and prefix', async () => {
    await coffee.fork(helper.npminstall, [
      `--prefix=${tmp}`,
      '-g',
      'mocha',
    ])
      .debug()
      .expect('stdout', /All packages installed/)
      .expect('code', 0)
      .end();

    if (process.platform === 'win32') {
      await coffee.fork(require.resolve('../bin/uninstall'), [
        `--prefix=${tmp}`,
        '-g',
        'mocha',
      ])
        .debug()
        .expect('stdout', /- mocha@\d+\.\d+\.\d+/)
        .expect('code', 0)
        .end();
    } else {
      await coffee.fork(require.resolve('../bin/uninstall'), [
        `--prefix=${tmp}`,
        '-g',
        'mocha',
      ])
        .debug()
        .expect('stdout', /- mocha@\d+\.\d+\.\d+ \.[\/\\]packages[\/\\]npminstall[\/\\]test[\/\\]fixtures[\/\\]tmp[\/\\]lib[\/\\]node_modules[\/\\]mocha/)
        .expect('stdout', /- mocha@\d+\.\d+\.\d+ \.[\/\\]packages[\/\\]npminstall[\/\\]test[\/\\]fixtures[\/\\]tmp[\/\\]bin[\/\\]mocha/)
        .expect('stdout', /- mocha@\d+\.\d+\.\d+ \.[\/\\]packages[\/\\]npminstall[\/\\]test[\/\\]fixtures[\/\\]tmp[\/\\]bin[\/\\]_mocha/)
        .expect('code', 0)
        .end();
    }
  });
});
