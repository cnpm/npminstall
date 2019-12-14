'use strict';

const assert = require('assert');
const normalize = require('npm-normalize-package-bin')

describe('test/normalize-bin.test.js', () => {
  it('should fix security bugs', () => {
    assert.deepEqual(normalize({
      name: 'foo',
      bin: '/etc/passwd'
    }), {
      name: 'foo',
      bin: {
        foo: 'etc/passwd',
      },
    });

    assert.deepEqual(normalize({
      name: 'foo',
      bin: '../../../../.././etc/passwd'
    }), {
      name: 'foo',
      bin: {
        foo: 'etc/passwd',
      },
    });
  });
});
