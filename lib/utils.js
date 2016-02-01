/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const fs = require('mz/fs');
const path = require('path');

exports.readJSON = function* readJSON(filepath) {
  const content = yield fs.readFile(filepath, 'utf8');
  return JSON.parse(content);
};

exports.mkdirp = function* mkdirp(dirpath) {
  if (yield fs.exists(dirpath)) {
    return false;
  }

  const parent = path.dirname(dirpath);
  const exists = yield fs.exists(parent);
  if (!exists) {
    yield exports.mkdirp(parent);
  }
  yield fs.mkdir(dirpath);
  return true;
};

exports.forceSymlink = function* forceSymlink(srcPath, dstPath, type) {
  try {
    yield fs.symlink(srcPath, dstPath, type);
  } catch(err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }

    const linkString = yield fs.readlink(dstPath);
    if (linkString === srcPath) {
      return;
    }

    yield fs.unlink(dstPath);
    yield exports.forceSymlink(srcPath, dstPath, type);
  }
};
