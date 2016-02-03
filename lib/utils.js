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
const _mkdirp = require('mkdirp');
const spawn = require('child_process').spawn;
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

exports.forceSymlink = function* forceSymlink(srcPath, dstPath, type) {
  type = type || 'junction';
  try {
    yield fs.symlink(srcPath, dstPath, type);
  } catch (err) {
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
  return new Promise((resolve, reject) => {
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

    const proc = spawn('sh', ['-c', script], {
      cwd: pkgDir,
      env: env,
      stdio: 'inherit',
    });

    proc.on('error', reject);

    proc.on('close', code => {
      if (code > 0) {
        return reject(new Error('Exit code ' + code));
      }
      return resolve();
    });
  });
};
