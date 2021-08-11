'use strict';

const orginalNpa = require('npm-package-arg');
const util = require('util');


module.exports = function npa(arg, { where, nested } = {}) {
  try {
    return orginalNpa(arg, where);
  } catch (error) {
    const { code, message } = error;

    let depsPath = '';
    if (nested) {
      depsPath = util.format(' package: %s', nested.showPath(arg));
    }

    const newError = new Error(util.format('%s%s', message, depsPath));
    newError.code = code;
    throw newError;
  }
};
