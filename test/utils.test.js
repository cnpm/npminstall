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
});
