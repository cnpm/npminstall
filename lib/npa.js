'use strict';

const orginalNpa = require('npm-package-arg');
const util = require('util');


module.exports = function npa(arg, where) {
  try {
    const p = orginalNpa(arg, where);
    return p;
  } catch (error) {
    const { code, message } = error;
    const newError = new Error(util.format('%s package: %o', message, arg));
    newError.code = code;
    throw newError;
  }
};
