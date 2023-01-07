module.exports = {
  name: 'foo',
  pedding: require('pedding/package.json'),
  has(pkgName) {
    require(pkgName);
  },
};
