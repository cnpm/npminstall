'use strict';

const npm = require('./npm');
const local = require('./local');
const remote = require('./remote');
const git = require('./git');

module.exports = async (pkg, options) => {
  if (pkg.type === 'local') {
    return await local(pkg, options);
  }
  if (pkg.type === 'remote') {
    return await remote(pkg, options);
  }
  if (pkg.type === 'git' || pkg.type === 'hosted') {
    return await git(pkg, options);
  }
  return await npm(pkg, options);
};
