'use strict';

const assert = require('assert');
const utils = require('../lib/utils');

describe('test/utils.test.js', () => {
  describe('matchPlatform()', () => {
    it('should match os names', () => {
      assert(utils.matchPlatform('darwin', []));
      assert(utils.matchPlatform('darwin', [ 'darwin' ]));
      assert(utils.matchPlatform('darwin', [ 'linux', 'darwin' ]));
      assert(utils.matchPlatform('darwin', [ 'linux', 'win32', 'darwin' ]));
      assert(utils.matchPlatform('win32', [ 'win32' ]));
      assert(utils.matchPlatform('linux', [ 'linux' ]));
      assert(utils.matchPlatform('darwin', [ '!win32' ]));
      assert(utils.matchPlatform('darwin', [ '!linux' ]));
      assert(utils.matchPlatform('darwin', [ '!linux', 'darwin' ]));
      assert(utils.matchPlatform('darwin', [ 'darwin', '!darwin' ]));
    });

    it('should match cpu names', () => {
      assert(utils.matchPlatform('x64', []));
      assert(utils.matchPlatform('x64', [ 'x64' ]));
      assert(utils.matchPlatform('x64', [ 'x64', 'ia32' ]));
      assert(utils.matchPlatform('x64', [ 'x64', 'ia32', 'arm' ]));
      assert(utils.matchPlatform('ia32', [ 'ia32' ]));
      assert(utils.matchPlatform('mips', [ 'mips' ]));
      assert(utils.matchPlatform('x64', [ '!mips' ]));
      assert(utils.matchPlatform('x64', [ '!ia32' ]));
      assert(utils.matchPlatform('x64', [ '!ia32', 'x64' ]));
      assert(utils.matchPlatform('x64', [ 'x64', '!x64' ]));
    });

    it('should not match os names', () => {
      assert(!utils.matchPlatform('darwin', [ 'linux' ]));
      assert(!utils.matchPlatform('darwin', [ 'win32' ]));
      assert(!utils.matchPlatform('darwin', [ 'linux', 'win32' ]));
      assert(!utils.matchPlatform('win32', [ 'darwin' ]));
      assert(!utils.matchPlatform('linux', [ 'darwin' ]));
      assert(!utils.matchPlatform('linux', [ '!linux' ]));
      assert(!utils.matchPlatform('darwin', [ '!darwin' ]));
      assert(!utils.matchPlatform('darwin', [ '!linux', '!darwin' ]));
      assert(!utils.matchPlatform('win32', [ '!win32' ]));
      assert(!utils.matchPlatform('win32', [ '!win32', 'win32' ]));
    });

    it('should not match cpu names', () => {
      assert(!utils.matchPlatform('x64', [ 'ia32' ]));
      assert(!utils.matchPlatform('ia32', [ 'x64' ]));
      assert(!utils.matchPlatform('ia32', [ 'mips', 'arm' ]));
      assert(!utils.matchPlatform('arm', [ '!arm' ]));
      assert(!utils.matchPlatform('mips', [ '!mips' ]));
      assert(!utils.matchPlatform('mips', [ '!x64', '!mips' ]));
      assert(!utils.matchPlatform('x64', [ '!x64' ]));
    });
  });

  describe('findMaxSatisfyingVersion()', () => {
    it('should use vaild version itself', () => {
      assert(utils.findMaxSatisfyingVersion('1.0.2', {
        latest: '2.0.0',
      }, [
        '1.0.1',
        '1.0.2',
        '1.0.3',
        '2.0.0',
      ]) === '1.0.2');
    });

    it('should return undefined when no version match', () => {
      assert(utils.findMaxSatisfyingVersion('>= 2.0.1 < 3.0.0', {
        latest: '2.0.0',
      }, [
        '1.0.1',
        '1.0.2',
        '1.0.3',
        '2.0.0',
      ]) === null);
    });

    it('should use max range version', () => {
      assert(utils.findMaxSatisfyingVersion('>= 1.0.1 < 2.0.0', {
        latest: '2.0.0',
      }, [
        '1.0.1',
        '1.0.2',
        '1.0.3',
        '2.0.0',
      ]) === '1.0.3');
    });

    it('should return latest version', () => {
      assert(utils.findMaxSatisfyingVersion('latest', {
        latest: '2.0.0',
        'latest-1': '1.0.2',
      }, [
        '1.0.1',
        '1.0.2',
        '1.0.3',
        '2.0.0',
      ]) === '2.0.0');
    });

    it('should support latest version first', () => {
      assert(utils.findMaxSatisfyingVersion('>= 1.0.1 < 2.0.0', {
        latest: '1.0.1',
        'latest-1': '1.0.2',
      }, [
        '1.0.1',
        '1.0.2',
        '1.0.3',
        '2.0.0',
      ]) === '1.0.1');
    });

    it('should support latest-{major} version', () => {
      assert(utils.findMaxSatisfyingVersion('>= 1.0.1 < 2.0.0', {
        latest: '2.0.0',
        'latest-1': '1.0.2',
      }, [
        '1.0.1',
        '1.0.2',
        '1.0.3',
        '2.0.0',
      ]) === '1.0.2');
    });
  });

  describe('parseTarballUrls()', () => {
    it('should return one url', () => {
      assert.deepEqual(utils.parseTarballUrls('https://registry.npmjs.org/node/-/node-10.3.0.tgz'), [
        'https://registry.npmjs.org/node/-/node-10.3.0.tgz',
      ]);
      assert.deepEqual(utils.parseTarballUrls('https://registry.npmjs.org/node/-/node-10.3.0.tgz?other_urls='), [
        'https://registry.npmjs.org/node/-/node-10.3.0.tgz?other_urls=',
      ]);
    });

    it('should return multi urls', () => {
      assert.deepEqual(utils.parseTarballUrls('http://foo-us1.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz?other_urls=http%3A%2F%2Fdefault.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz%2Chttp%3A%2F%2Fbackup.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz'), [
        'http://foo-us1.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz?other_urls=http%3A%2F%2Fdefault.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz%2Chttp%3A%2F%2Fbackup.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz',
        'http://default.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz',
        'http://backup.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz',
      ]);

      assert.deepEqual(utils.parseTarballUrls('http://foo-us1.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz?foo=bar&other_urls=http%3A%2F%2Fdefault.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz%2Chttp%3A%2F%2Fbackup.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz'), [
        'http://foo-us1.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz?foo=bar&other_urls=http%3A%2F%2Fdefault.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz%2Chttp%3A%2F%2Fbackup.oss.com%2F%40cnpmtest%2Fdownload-test-module%2F-%2F%40cnpmtest%2Fdownload-test-module-1.0.0.tgz',
        'http://default.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz',
        'http://backup.oss.com/@cnpmtest/download-test-module/-/@cnpmtest/download-test-module-1.0.0.tgz',
      ]);
    });
  });
});
