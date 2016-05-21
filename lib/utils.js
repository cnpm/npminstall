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
const get = require('./get');
const fse = require('co-fs-extra');
const destroy = require('destroy');

exports.readJSON = function* readJSON(filepath) {
  if (!(yield fs.exists(filepath))) {
    return {};
  }
  const content = yield fs.readFile(filepath, 'utf8');
  try {
    return JSON.parse(content.trim());
  } catch (err) {
    err.message += ` (file: ${filepath})`;
    console.error('content buffer: %j', yield fs.readFile(filepath));
    throw err;
  }
};

exports.addMetaToJSONFile = function*(filepath, meta) {
  const pkg = yield exports.readJSON(filepath);
  for (const key in meta) {
    pkg[key] = meta[key];
  }
  yield fs.writeFile(filepath, JSON.stringify(pkg, null, 2));
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
  // cleanup dest
  try {
    const linkString = yield fs.readlink(dest);
    // already linked
    if (linkString === relative) {
      return relative;
    }
  } catch (err) {
    // ignore error, will always cleanup dest
  }
  yield exports.rimraf(dest);

  const destDir = path.dirname(dest);
  // check if destDir is not exist
  if (!(yield fs.exists(destDir))) {
    yield exports.mkdirp(destDir);
  }

  yield fs.symlink(relative, dest, type);
  return relative;
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
  // merge config.env <= process.env <= options.env
  const env = {};

  for (const key in config.env) {
    env[key] = config.env[key];
  }

  for (const key in process.env) {
    // ignore `Path` env on Windows
    if (/^path$/i.test(key)) {
      continue;
    }
    env[key] = process.env[key];
  }

  for (const key in options.env) {
    // ignore `Path` env on Windows
    if (/^path$/i.test(key)) {
      continue;
    }
    env[key] = options.env[key];
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
  const donefile = path.join(targetdir, '.npminstall.done');
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


exports.getTarballStream = function* (url, options) {
  const result = yield get(url, {
    timeout: options.timeout,
    followRedirect: true,
    streaming: true,
  }, options);

  if (result.status !== 200) {
    destroy(result.res);
    throw new Error(`Download ${url} status: ${result.status} error, should be 200`);
  }
  return result.res;
};

exports.getBinaryMirrors = function* getBinaryMirrors(registry) {
  const registries = [ registry ].concat([
    'https://registry.npm.taobao.org',
    'https://r.cnpmjs.org',
    'https://registry.npmjs.org',
  ]);
  let lastErr;
  let binaryMirrors;
  for (const registry of registries) {
    const binaryMirrorUrl = registry + '/binary-mirror-config/latest';
    try {
      const res = yield get(binaryMirrorUrl, {
        dataType: 'json',
        followRedirect: true,
      });
      binaryMirrors = res.data.mirrors.china;
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!binaryMirrors) {
    console.warn('Get /binary-mirror-config/latest from %s error: %s', registry, lastErr.stack);
    binaryMirrors = require('binary-mirror-config/package.json').mirrors.china;
  }

  return binaryMirrors;
};

exports.matchPlatform = function(current, osNames) {
  if (!Array.isArray(osNames) || osNames.length === 0) {
    return true;
  }
  let hasAnti = false;
  for (const name of osNames) {
    if (name === current) {
      return true;
    }
    if (name[0] === '!') {
      hasAnti = true;
      if (name.substring(1) === current) {
        return false;
      }
    }
  }
  return hasAnti ? true : false;
};

exports.isSudo = function() {
  const effectiveUser = process.env.USER;
  const actualUser = process.env.SUDO_USER || process.env.USER;
  return effectiveUser === 'root' && actualUser !== 'root';
};
