'use strict';

const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');
const mm = require('mm');

describe('test/node-sass.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);
  afterEach(mm.restore);

  it('should auto set npm_config_cache env', function* () {
    mm(process.env, 'npm_config_cache', undefined);
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'node-sass', version: '3' },
      ],
      env: {
        npm_config_cache: undefined,
      },
    });
  });
});
