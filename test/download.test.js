'use strict';

const assert = require('assert');
const mm = require('mm');
const urllib = require('urllib');
const rimraf = require('rimraf');
const path = require('path');
const install = require('..');
const mkdirp = require('../lib/utils').mkdirp;

describe('test/download.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp');

  function cleanup() {
    rimraf.sync(tmp);
  }

  beforeEach(function* () {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);
  afterEach(mm.restore);

  describe('mock tarball not exists', () => {
    it('should throw error when status === 404', function* () {
      const request = urllib.request;
      mm(urllib, 'request', function* (url, options) {
        if (url.endsWith('.tgz')) {
          mm.restore();
        }
        const result = yield request.call(urllib, url, options);
        if (url.endsWith('.tgz')) {
          result.status = 404;
        }
        return result;
      });

      try {
        yield install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 404 status/.test(err.message), err.message);
      }
    });

    it('should throw error when status === 206', function* () {
      const request = urllib.request;
      mm(urllib, 'request', function* (url, options) {
        if (url.endsWith('.tgz')) {
          mm.restore();
        }
        const result = yield request.call(urllib, url, options);
        if (url.endsWith('.tgz')) {
          result.status = 206;
        }
        return result;
      });

      try {
        yield install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          cacheDir: '',
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/status: 206 error, should be 200/.test(err.message), err.message);
      }
    });
  });

  describe('mock tarball error', () => {
    it('should throw sha1 error', function* () {
      const request = urllib.request;
      mm(urllib, 'request', function* (url, options) {
        const result = yield request.call(urllib, url, options);
        if (!url.endsWith('.tgz')) {
          // change sha1 to wrong value
          result.data.dist.shasum = '00098d60307b4ef7240c3d693cb20a9473c111';
        }
        return result;
      });

      try {
        yield install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/sha1:7f5098d60307b4ef7240c3d693cb20a9473c6074 not equal to 00098d60307b4ef7240c3d693cb20a9473c111/.test(err.message), err.message);
      }
    });

    it('should throw 500 error', function* () {
      const request = urllib.request;
      mm(urllib, 'request', function* (url, options) {
        const result = yield request.call(urllib, url, options);
        if (url.endsWith('.tgz')) {
          result.status = 500;
        }
        return result;
      });

      try {
        yield install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 500 status/.test(err.message), err.message);
      }
    });

    it('should throw 502 error', function* () {
      const request = urllib.request;
      mm(urllib, 'request', function* (url, options) {
        const result = yield request.call(urllib, url, options);
        if (url.endsWith('.tgz')) {
          result.status = 502;
        }
        return result;
      });

      try {
        yield install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 502 status/.test(err.message), err.message);
      }
    });
  });
});
