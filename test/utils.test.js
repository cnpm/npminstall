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
const utils = require('../lib/utils');

describe('test/utils.test.js', () => {
  describe('matchPlatform()', () => {
    it('should match os names', () => {
      assert(utils.matchPlatform('darwin', []));
      assert(utils.matchPlatform('darwin', ['darwin']));
      assert(utils.matchPlatform('darwin', ['linux', 'darwin']));
      assert(utils.matchPlatform('darwin', ['linux', 'win32', 'darwin']));
      assert(utils.matchPlatform('win32', ['win32']));
      assert(utils.matchPlatform('linux', ['linux']));
      assert(utils.matchPlatform('darwin', ['!win32']));
      assert(utils.matchPlatform('darwin', ['!linux']));
      assert(utils.matchPlatform('darwin', ['!linux', 'darwin']));
      assert(utils.matchPlatform('darwin', ['darwin', '!darwin']));
    });

    it('should not match os names', () => {
      assert(!utils.matchPlatform('darwin', ['linux']));
      assert(!utils.matchPlatform('darwin', ['win32']));
      assert(!utils.matchPlatform('darwin', ['linux', 'win32']));
      assert(!utils.matchPlatform('win32', ['darwin']));
      assert(!utils.matchPlatform('linux', ['darwin']));
      assert(!utils.matchPlatform('linux', ['!linux']));
      assert(!utils.matchPlatform('darwin', ['!darwin']));
      assert(!utils.matchPlatform('darwin', ['!linux', '!darwin']));
      assert(!utils.matchPlatform('win32', ['!win32']));
      assert(!utils.matchPlatform('win32', ['!win32', 'win32']));
    });
  });
});
