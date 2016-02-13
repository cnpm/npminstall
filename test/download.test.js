/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

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

  beforeEach(function*() {
    cleanup();
    yield mkdirp(tmp);
  });
  afterEach(cleanup);

  describe('mock tarball not exists', () => {
    afterEach(mm.restore);

    it('should throw error when status === 404', function*() {
      const request = urllib.request;
      mm(urllib, 'request', function*(url, options) {
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
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 404 status/.test(err.message));
      }
    });

    it('should throw error when status === 206', function*() {
      const request = urllib.request;
      mm(urllib, 'request', function*(url, options) {
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
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/status: 206 error, should be 200/.test(err.message));
      }
    });
  });
});
