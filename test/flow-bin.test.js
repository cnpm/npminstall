'use strict';

const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');
const utils = require('../lib/utils');

describe('test/flow-bin.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(() => {
    cleanup();
    mkdirp.sync(tmp);
  });
  afterEach(cleanup);

  it('should install flow-bin from china mirror', function* () {
    if (!process.env.local) return;
    const registry = process.env.local ? 'https://registry.npm.taobao.org' : 'https://registry.npmjs.com';
    const binaryMirrors = yield utils.getBinaryMirrors(registry);
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'flow-bin' },
      ],
      binaryMirrors,
    });
  });
});
