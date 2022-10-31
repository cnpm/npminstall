'use strict';

const assert = require('assert');
const Downloader = require('../../lib/rapid-mode/downloader');
const Util = require('./fixtures/util');
const os = require('os');

describe('test/rapid-mode/downloader.test.js', () => {
  if (os.platform() === 'win32') {
    return;
  }

  describe('optional dep', () => {
    it('should skip cpu/os not match and optional dep', async () => {
      const pkgLockJson = await Util.readFixtureJson('package-locks', 'optional.json');
      const downloader = new Downloader({
        platform: 'linux',
        arch: 'aarch64',
      });
      const tasks = downloader.createDownloadTask(pkgLockJson);
      assert.deepStrictEqual(tasks, [{
        id: 'bindings@1.5.0',
        name: 'bindings',
        version: '1.5.0',
        sha: 'sha1-EDU8npRTNLwFEabZCzj7x8nFBN8=',
        url: 'https://registry.npmmirror.com/bindings/download/bindings-1.5.0.tgz',
        pkg: {
          version: '1.5.0',
          resolved: 'https://registry.npmmirror.com/bindings/download/bindings-1.5.0.tgz',
          integrity: 'sha1-EDU8npRTNLwFEabZCzj7x8nFBN8=',
          optional: true,
          dependencies: {
            'file-uri-to-path': '1.0.0',
          },
        },
      }, {
        id: 'file-uri-to-path@1.0.0',
        name: 'file-uri-to-path',
        version: '1.0.0',
        sha: 'sha1-VTp7hEb/b2hDWcRF8eN6BdrMM90=',
        url: 'https://registry.npmmirror.com/file-uri-to-path/download/file-uri-to-path-1.0.0.tgz',
        pkg: {
          version: '1.0.0',
          resolved: 'https://registry.npmmirror.com/file-uri-to-path/download/file-uri-to-path-1.0.0.tgz',
          integrity: 'sha1-VTp7hEb/b2hDWcRF8eN6BdrMM90=',
          optional: true,
        },
      }, {
        id: 'nan@2.15.0',
        name: 'nan',
        version: '2.15.0',
        sha: 'sha1-PzSkc/8Y4VwbVia2KQO1rW5mX+4=',
        url: 'https://registry.npmmirror.com/nan/download/nan-2.15.0.tgz',
        pkg: {
          version: '2.15.0',
          resolved: 'https://registry.npmmirror.com/nan/download/nan-2.15.0.tgz',
          integrity: 'sha1-PzSkc/8Y4VwbVia2KQO1rW5mX+4=',
          optional: true,
        },
      }]);
    });
  });

  describe('dev dep', () => {
    it('should skip dev dep when prod install', async () => {
      const pkgLockJson = await Util.readFixtureJson('package-locks', 'dev.json');
      const downloader = new Downloader({
        platform: 'linux',
        arch: 'aarch64',
        production: true,
      });
      const tasks = downloader.createDownloadTask(pkgLockJson);
      assert.deepStrictEqual(tasks, []);
    });
  });
});
