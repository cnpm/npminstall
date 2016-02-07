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

const debug = require('debug')('npminstall:download');
const fs = require('mz/fs');
const path = require('path');
const crypto = require('crypto');
const tar = require('tar');
const zlib = require('zlib');
const get = require('./get');
const utils = require('./utils');

module.exports = function* download(pkg, options) {
  const ungzipDir = path.join(options.storeDir, pkg.name, pkg.version);
  const donefile = path.join(ungzipDir, '.tnpminstall.done');

  // make sure only one download for a version
  const key = `download:${pkg.name}@${pkg.version}`;
  if (options.cache[key]) {
    if (options.cache[key].done) {
      return {
        exists: true,
        dir: ungzipDir,
      };
    }
    // wait download finish
    yield options.events.await(key);
    return {
      exists: true,
      dir: ungzipDir,
    };
  }
  options.cache[key] = {
    done: false,
  };

  yield utils.mkdirp(ungzipDir);
  if (yield fs.exists(donefile)) {
    debug('[%s@%s] Exists', pkg.name, pkg.version);
    return {
      exists: true,
      dir: ungzipDir,
    };
  }

  debug('[%s@%s] GET %j', pkg.name, pkg.version, pkg.dist.tarball);
  const result = yield get(pkg.dist.tarball, {
    timeout: options.timeout,
    followRedirect: true,
    streaming: true,
  });

  if (result.status !== 200) {
    throw new Error(`Download ${pkg.dist.tarball} status: ${result.status} error, should be 200`);
  }

  yield checkShasumAndUngzip(ungzipDir, result.res, pkg);
  yield fs.writeFile(donefile, Date());
  options.cache[key].done = true;
  options.events.emit(key);

  return {
    exists: false,
    dir: ungzipDir,
  };
};

function checkShasumAndUngzip(ungzipDir, readstream, pkg) {
  return function(callback) {
    const shasum = pkg.dist.shasum;
    const hash = crypto.createHash('sha1');
    const gunzip = zlib.createGunzip();
    const extracter = tar.Extract({ path: ungzipDir, strip: 1 });

    function handleCallback(err) {
      if (!callback) {
        // ignore it
        return;
      }
      if (err) {
        err.message += ` (${pkg.name}@${pkg.version})`;
      }
      callback(err);
      callback = null;
    }

    readstream.on('data', buf => hash.update(buf));

    readstream.on('finish', () => {
      const realShasum = hash.digest('hex');
      if (realShasum !== shasum) {
        handleCallback(new Error(`${pkg.name}@${pkg.version} sha1:${realShasum} not equal to ${shasum}`));
      }
    });
    extracter.on('end', handleCallback);
    readstream.once('error', handleCallback);
    gunzip.on('error', handleCallback);
    extracter.on('error', handleCallback);

    readstream.pipe(gunzip).pipe(extracter);
  };
}
