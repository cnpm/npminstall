const Nested = require('../lib/nested');
const assert = require('assert');

const mockPkgs = [
  'a@1.0.0',
  'b@2.0.0',
];

describe('test/nested.test.js', () => {
  it('should nested success, when pkgs is Array', () => {
    const nested = new Nested(mockPkgs);
    assert.strictEqual(nested.showPath('a@1.0.0'), 'root › a@1.0.0');
  });

  it('should nested success, when update', () => {
    const nested = new Nested(mockPkgs);
    nested.update([ 'c@3.0.0' ]);
    assert.strictEqual(nested.showPath('c@3.0.0'), 'root › c@3.0.0');

  });

  it('should showPath sucess', () => {
    const nested = new Nested([]);
    nested.depMap.set('a@^1', 'b@^1');
    nested.depMap.set('b@^1', 'c@^1');
    nested.depMap.set('c@^1', 'root');
    assert.strictEqual(nested.showPath('a@^1'), 'root › c@^1 › b@^1 › a@^1');
  });

  it('should break on cycle nested deps', () => {
    const nested = new Nested([]);
    nested.depMap.set('a@^1', 'b@^1');
    nested.depMap.set('b@^1', 'c@^1');
    nested.depMap.set('c@^1', 'a@^1');
    assert.strictEqual(nested.showPath('a@^1'), 'c@^1 › b@^1 › a@^1');

  });
});
