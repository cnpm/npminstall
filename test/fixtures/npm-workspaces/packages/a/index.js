const path = require('node:path');

const eggMock = path.dirname(require.resolve('egg-mock/package.json'));
console.log('eggMock %s', eggMock);

const egg = require.resolve('egg/package.json', { paths: [ eggMock ] });
console.log('egg %s', egg);

module.exports = 'packages/a';
