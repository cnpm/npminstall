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
const fs = require('fs');
const mfs = require('mz/fs');
const path = require('path');
const crypto = require('crypto');
const tar = require('tar');
const zlib = require('zlib');
const get = require('./get');
const utils = require('./utils');

module.exports = function* download(pkg, options) {
  const storeDir = path.join(options.storeDir, pkg.name);
  const tgzfile = path.join(storeDir, pkg.version + '.tgz');
  const ungzipDir = path.join(storeDir, pkg.version);
  const donefile = path.join(ungzipDir, '.tnpminstall.done');

  // make sure only one download for a version
  const key = 'download:' + pkg.name + '@' + pkg.version;
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

  yield utils.mkdirp(storeDir);
  yield utils.mkdirp(ungzipDir);
  if (yield mfs.exists(donefile)) {
    debug('[%s@%s] Exists', pkg.name, pkg.version);
    return {
      exists: true,
      dir: ungzipDir,
    };
  }

  debug('[%s@%s] GET %j', pkg.name, pkg.version, pkg.dist.tarball);
  const writeStream = fs.createWriteStream(tgzfile);
  const result = yield get(pkg.dist.tarball, {
    writeStream: writeStream,
    timeout: options.timeout,
    followRedirect: true,
  });

  if (result.status !== 200) {
    throw new Error(`Download ${pkg.dist.tarball} status: ${result.status} error, should be 200`);
  }

  yield checkShasumAndUngzip(ungzipDir, tgzfile, pkg.dist.shasum);
  yield mfs.unlink(tgzfile);
  yield mfs.writeFile(donefile, Date());
  options.cache[key].done = true;
  options.events.emit(key);

  return {
    exists: false,
    dir: ungzipDir,
  };
};

function checkShasumAndUngzip(ungzipDir, tgzfile, shasum) {
  return function(callback) {
    const hash = crypto.createHash('sha1');
    const readstream = fs.createReadStream(tgzfile);
    const gunzip = zlib.createGunzip();
    const extracter = tar.Extract({ path: ungzipDir, strip: 1 });

    function handleCallback(err) {
      if (!callback) {
        // ignore it
        return;
      }
      callback(err);
      callback = null;
    }

    readstream.on('data', function(buf) {
      hash.update(buf);
    });
    readstream.on('finish', function() {
      const realShasum = hash.digest('hex');
      let err;
      if (realShasum !== shasum) {
        err = new Error(tgzfile + ' sha1:' + realShasum + ' not equal to ' + shasum);
        handleCallback(err);
      }
    });
    extracter.on('end', function() {
      handleCallback();
    });

    readstream.once('error', handleCallback);
    gunzip.on('error', handleCallback);
    extracter.on('error', handleCallback);

    readstream.pipe(gunzip).pipe(extracter);
  };
}
