'use strict';

const assert = require('assert');
// npm-normalize-package-bin dont support node 4
let normalize;
if (process.version.indexOf('v4.') === -1) {
  normalize = require('npm-normalize-package-bin');
} else {
  console.warn('ignore normalize on node 4');
}

describe('test/normalize-bin.test.js', () => {
  it('should fix security bugs', () => {
    normalize && assert.deepEqual(normalize({
      name: 'foo',
      bin: '/etc/passwd',
    }), {
      name: 'foo',
      bin: {
        foo: 'etc/passwd',
      },
    });

    normalize && assert.deepEqual(normalize({
      name: 'foo',
      bin: '../../../../.././etc/passwd',
    }), {
      name: 'foo',
      bin: {
        foo: 'etc/passwd',
      },
    });
  });
});
