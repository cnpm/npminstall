'use strict';

const npm = require('./npm');
const local = require('./local');
const remote = require('./remote');
const git = require('./git');

module.exports = function* (pkg, options) {
  if (pkg.type === 'local') {
    return yield local(pkg, options);
  }
  if (pkg.type === 'remote') {
    return yield remote(pkg, options);
  }
  if (pkg.type === 'git' || pkg.type === 'hosted') {
    return yield git(pkg, options);
  }
  return yield npm(pkg, options);
};
