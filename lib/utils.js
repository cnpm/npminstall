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
const tar = require('tar');
const zlib = require('zlib');
const _rimraf = require('rimraf');
const _mkdirp = require('mkdirp');
const runscript = require('runscript');
const config = require('./config');
const fse = require('co-fs-extra');

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

exports.getMaxRange = function(spec) {
  // >=1.0.0 <2.0.0
  const r = /^>=.*?<(.*?)$/.exec(spec);
  if (r) {
    return r[1];
  }
};

exports.getPackageStorePath = function(storeDir, pkg) {
  return path.join(storeDir, pkg.name, pkg.version, pkg.name);
};

exports.unpack = function(readstream, target) {
  return new Promise((resolve, reject) => {
    const extracter = tar.Extract({ path: target, strip: 1 });
    const gunzip = zlib.createGunzip();

    // just support gzip tarball and nacked tarball
    readstream
      .on('data', function ondata(data) {
        // detect what it is.
        // Then, depending on that, we'll figure out whether it's
        // gzipped tarball or naked tarball.
        // gzipped files all start with 1f8b08
        if (data[0] === 0x1F &&
          data[1] === 0x8B &&
          data[2] === 0x08) {
          readstream.pipe(gunzip).pipe(extracter);
        } else {
          readstream.pipe(extracter);
        }

        // re-emit
        readstream.removeListener('data', ondata);
        readstream.emit('data', data);
      });

    extracter.on('end', handleCallback);
    readstream.on('error', handleCallback);
    gunzip.on('error', handleCallback);
    extracter.on('error', handleCallback);

    let ended = false;
    function handleCallback(err) {
      if (ended) {
        return;
      }
      ended = true;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    }
  });
};

exports.copyInstall = function* (src, options) {
  // 1. make sure source folder has package.json, and package.json contains name
  // 2. get the target directory: $storeDir/${pkg.name}/${pkg.version}
  // 3. check if this package has been installed, and make sure only copy once.
  // 4. if already installed, return with exists = true
  // 5. if not installed, copy and return with exists = false
  const pkgpath = path.join(src, 'package.json');
  if (!(yield fs.exists(pkgpath))) {
    throw new Error(`package.json missed(${pkgpath})`);
  }
  const realPkg = yield exports.readJSON(pkgpath);
  if (!realPkg.name || !realPkg.version) {
    throw new Error(`package.json must contains name and version(${pkgpath})`);
  }

  const targetdir = exports.getPackageStorePath(options.storeDir, realPkg);
  const donefile = path.join(targetdir, '.tnpminstall.done');
  const key = `copy:${targetdir}`;
  const result = {
    dir: targetdir,
    package: realPkg,
    exists: true,
  };

  if (options.cache[key]) {
    options.console.log('exist cache: %j %j', key, options.cache[key]);
    if (options.cache[key].done) {
      return result;
    }
    // wait copy finish
    yield options.events.await(key);
    return result;
  }

  options.cache[key] = {
    done: false,
  };

  if (!(yield fs.exists(donefile))) {
    yield fse.emptydir(targetdir);
    yield fse.copy(src, targetdir);
    yield fs.writeFile(donefile, Date());
    result.exists = false;
  }

  options.cache[key].done = true;
  options.events.emit(key);
  return result;
};

exports.getPkgFromPaths = function* (name, paths) {
  for (const p of paths) {
    const tryPath = path.join(p, name, 'package.json');
    const pkg = yield exports.readJSON(tryPath);
    if (pkg.name && pkg.version) {
      pkg.installPath = path.join(p, name);
      return pkg;
    }
  }
  return null;
};
