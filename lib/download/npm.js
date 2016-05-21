/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('npminstall:download:npm');
const bytes = require('bytes');
const fs = require('mz/fs');
const path = require('path');
const crypto = require('crypto');
const tar = require('tar');
const url = require('url');
const zlib = require('zlib');
const destroy = require('destroy');
const utility = require('utility');
const get = require('../get');
const utils = require('../utils');

module.exports = function* (pkg, options) {
  // get npm package info
  const pkgUrl = getPackageNpmUri(pkg, options);
  const result = yield get(pkgUrl, {
    dataType: 'json',
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
  }, options);
  const realPkg = result.data;
  options.totalJSONSize += result.res.size;
  options.totalJSONCount += 1;
  debug('[%s@%s] status %s, real version: %s, headers: %j, responseSize: %s',
    pkg.name, pkg.version, result.status, realPkg.version, result.headers, result.res.size);

  // download tarball and unzip
  const info = yield download(realPkg, options);
  info.package = realPkg;
  return info;
};

function getPackageNpmUri(pkg, options) {
  let name = pkg.name;
  if (name[0] === '@') {
    // dont encodeURIComponent @ char, it will be 405
    // https://registry.npmjs.org/%40rstacruz%2Ftap-spec/%3E%3D4.1.1
    name = '@' + utility.encodeURIComponent(name.substring(1));
  } else {
    name = utility.encodeURIComponent(name);
  }
  const pkgUrl = url.resolve(options.registry, name + '/' + utility.encodeURIComponent(pkg.spec));
  debug('[%s@%s] GET %j', pkg.name, pkg.spec, pkgUrl);
  return pkgUrl;
}

function* download(pkg, options) {
  const ungzipDir = utils.getPackageStorePath(options.storeDir, pkg);
  const donefile = path.join(ungzipDir, '.npminstall.done');

  // make sure only one download for a version
  const key = `download:${pkg.name}@${pkg.version}`;
  if (options.cache[key]) {
    // wait download finish
    if (!options.cache[key].done) {
      yield options.events.await(key);
    }
    return {
      exists: true,
      dir: ungzipDir,
    };
  }
  options.cache[key] = {
    done: false,
  };

  if (yield fs.exists(donefile)) {
    options.cache[key].done = true;
    // debug('[%s@%s] Exists', pkg.name, pkg.version);
    return {
      exists: true,
      dir: ungzipDir,
    };
  }

  yield utils.mkdirp(ungzipDir);
  const stream = yield getTarballStream(pkg, options);
  yield checkShasumAndUngzip(ungzipDir, stream, pkg);
  yield fs.writeFile(donefile, Date());

  const pkgMeta = {
    _from: `${pkg.name}@${pkg.version}`,
    _resolved: pkg.dist.tarball,
  };
  const binaryMirror = options.binaryMirrors[pkg.name];
  if (binaryMirror && pkg.scripts && pkg.scripts.install) {
    // leveldown and sqlite3
    // nodegit
    if (/prebuild \-\-install/.test(pkg.scripts.install) ||
        /prebuild \-\-download/.test(pkg.scripts.install) ||
        /node\-pre\-gyp install/.test(pkg.scripts.install) ||
        pkg.name === 'nodegit') {
      const newBinary = pkg.binary || {};
      for (const key in binaryMirror) {
        newBinary[key] = binaryMirror[key];
      }
      pkgMeta.binary = newBinary;
      options.console.info(`[${pkg.name}@${pkg.version}] download from binary mirror: %j`, newBinary);
    }
  }
  yield utils.addMetaToJSONFile(path.join(ungzipDir, 'package.json'), pkgMeta);

  options.cache[key].done = true;
  options.events.emit(key);
  options.registryPackages++;

  return {
    exists: false,
    dir: ungzipDir,
  };
}

function* getTarballStream(pkg, options) {
  if (!options.cacheDir || utils.isSudo()) {
    // sudo don't touch the cacheDir
    // production mode
    debug('[%s@%s] GET streaming %j', pkg.name, pkg.version, pkg.dist.tarball);
    const result = yield get(pkg.dist.tarball, {
      timeout: options.timeout,
      followRedirect: true,
      streaming: true,
    }, options);

    if (result.status !== 200) {
      destroy(result.res);
      throw new Error(`Download ${pkg.dist.tarball} status: ${result.status} error, should be 200`);
    }

    // record size
    result.res.on('data', chunk => {
      options.totalTarballSize += chunk.length;
    });
    return result.res;
  }

  // multi process problems
  let paths = [options.cacheDir];
  let name = pkg.name;
  if (name[0] === '@') {
    name = name.split('/')[1];
  }
  paths = paths.concat(name.toLowerCase().replace(/[\-\_\.]/g, '').split('', 4));
  paths.push(pkg.name);
  const parentDir = path.join.apply(path, paths);
  let tarballFile = path.join(parentDir, `${pkg.version}-${pkg.dist.shasum}.tgz`);
  if (!(yield fs.exists(tarballFile))) {
    yield utils.mkdirp(parentDir);
    const tmpFile = path.join(parentDir, `${pkg.version}-tmp.tgz`);
    const result = yield get(pkg.dist.tarball, {
      timeout: options.timeout,
      followRedirect: true,
      writeStream: fs.createWriteStream(tmpFile),
    }, options);

    if (result.status !== 200) {
      throw new Error(`Download ${pkg.dist.tarball} status: ${result.status} error, should be 200`);
    }
    if (yield fs.exists(tarballFile)) {
      yield fs.unlink(tarballFile);
    }
    yield fs.rename(tmpFile, tarballFile);
    const stat = yield fs.stat(tarballFile);
    debug('[%s@%s] saved %s %s => %s',
      pkg.name, pkg.version, bytes(stat.size), pkg.dist.tarball, tarballFile);
    options.totalTarballSize += stat.size;
  }

  const stream = fs.createReadStream(tarballFile);
  stream.tarballFile = tarballFile;
  return stream;
}

function checkShasumAndUngzip(ungzipDir, readstream, pkg) {
  return function(callback) {
    const shasum = pkg.dist.shasum;
    const hash = crypto.createHash('sha1');
    const gunzip = zlib.createGunzip();
    const extracter = tar.Extract({ path: ungzipDir, strip: 1 });

    function handleCallback(err) {
      if (err) {
        err.message += ` (${pkg.name}@${pkg.version})`;
        if (readstream.tarballFile && fs.existsSync(readstream.tarballFile)) {
          debug('[%s@%s] remove tarball file: %s, because %s',
            pkg.name, pkg.version, readstream.tarballFile, err);
          // remove tarball cache file
          fs.unlinkSync(readstream.tarballFile);
        }
      }
      if (!callback) {
        // ignore it
        return;
      }
      // ensure callback once
      const cb = callback;
      callback = null;
      cb(err);
    }

    readstream.on('data', buf => hash.update(buf));
    readstream.on('end', () => {
      // this will be fire before extracter `env` event fire.
      const realShasum = hash.digest('hex');
      if (realShasum !== shasum) {
        handleCallback(new Error(`${pkg.name}@${pkg.version} sha1:${realShasum} not equal to ${shasum}`));
      }
    });

    extracter.on('end', handleCallback);
    readstream.on('error', handleCallback);
    gunzip.on('error', handleCallback);
    extracter.on('error', handleCallback);

    readstream.pipe(gunzip).pipe(extracter);
  };
}
