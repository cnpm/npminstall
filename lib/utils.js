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
const _rimraf = require('rimraf');
const _mkdirp = require('mkdirp');
const runscript = require('runscript');
const config = require('./config');

exports.readJSON = function* readJSON(filepath) {
  if (!(yield fs.exists(filepath))) {
    return {};
  }
  const content = yield fs.readFile(filepath, 'utf8');
  return JSON.parse(content);
};

exports.mkdirp = function mkdirp(dir, mod) {
  return new Promise((resolve, reject) => {
    _mkdirp(dir, mod, err => err ? reject(err) : resolve());
  });
};

exports.rimraf = function rimraf(dir) {
  return new Promise((resolve, reject) => {
    _rimraf(dir, err => err ? reject(err) : resolve());
  });
};

exports.relative = function relative(src, dest) {
  // Windows don't support relative path
  if (process.platform === 'win32') {
    return src;
  } else {
    return path.relative(path.dirname(dest), src);
  }
};

exports.forceSymlink = function* forceSymlink(src, dest, type) {
  const relative = exports.relative(src, dest);
  type = type || 'junction';

  try {
    yield fs.symlink(relative, dest, type);
    return relative;
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }

    const linkString = yield fs.readlink(dest);
    if (linkString === relative) {
      return relative;
    }

    yield fs.unlink(dest);
    yield exports.forceSymlink(src, dest, type);
    return relative;
  }
};

exports.forceStat = function* isSymbolicLink(linkPath) {
  let stat;
  try {
    stat = yield fs.lstat(linkPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return stat;
};

/*
 * Runs an npm script.
 */

exports.runScript = function runScript(pkgDir, script, options) {
  const env = Object.create(process.env);

  for (const key in config.env) {
    env[key] = env[key] || config.env[key];
  }

  env.PATH = [
    path.join(options.root, 'node_modules', '.bin'),
    path.join(pkgDir, 'node_modules', '.bin'),
    path.join(__dirname, '..', 'node_modules', '.bin'),
    process.env.PATH,
  ].join(path.delimiter);

  return runscript(script, {
    cwd: pkgDir,
    env: env,
    stdio: 'inherit',
  });
};
