const moduleA = require('aa');
console.log(moduleA, require.resolve('aa'));
const moduleB = require('b');
console.log(moduleB, require.resolve('b'));
console.log(require.resolve('abbrev-range'));
