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
const spawn = require('child_process').spawn;

exports.exists = fs.exists;

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

exports.runScript = function runScript(root, script) {
  return new Promise((resolve, reject) => {
    const env = Object.create(process.env);
    env.PATH = [
      path.join(root, 'node_modules', '.bin'),
      path.join(__dirname, '..', 'node_modules', '.bin'),
      process.env.PATH,
    ].join(path.delimiter);

    const proc = spawn('sh', ['-c', script], {
      cwd: root,
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
