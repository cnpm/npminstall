'use strict';

const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const npminstall = require('./npminstall');
const mm = require('mm');

describe('test/grpc.test.js', () => {
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

  it('should install grpc success', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'grpc' },
      ],
      production: true,
    });
  });

  it('should install pomjs success', function* () {
    yield npminstall({
      root: tmp,
      pkgs: [
        { name: 'pomjs' },
      ],
      production: true,
    });
  });
});
