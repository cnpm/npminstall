'use strict';

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
const semver = require('semver');
const urlresolve = require('url').resolve;
const chalk = require('chalk');
const uuid = require('uuid');
const moment = require('moment');
const get = require('../get');
const utils = require('../utils');

module.exports = function* (pkg, options) {
  const realPkg = yield resolve(pkg, options);
  // download tarball and unzip
  const info = yield download(realPkg, options);
  info.package = realPkg;

  return info;
};

module.exports.resolve = resolve;

function* resolve(pkg, options) {
  const packageMetaKey = `npm:resolve:package:${pkg.name}`;
  let packageMeta = options.cache[packageMetaKey];
  if (!packageMeta) {
    // add a lock to make sure fetch full meta once
    packageMeta = { done: false };
    options.cache[packageMetaKey] = packageMeta;
    let err;
    try {
      const fullMeta = yield getFullPackageMeta(pkg.name, options);
      Object.assign(packageMeta, fullMeta);
      packageMeta.done = true;
      packageMeta.allVersions = Object.keys(packageMeta.versions);
    } catch (e) {
      err = e;
      // clean cache
      options.cache[packageMetaKey] = null;
    }

    if (err) {
      options.events.emit(packageMetaKey, err);
      throw err;
    } else {
      options.events.emit(packageMetaKey);
    }
  } else if (!packageMeta.done) {
    debug('await %s', packageMetaKey);
    const err = yield options.events.await(packageMetaKey);
    if (err) throw err;
  }

  // check cache first
  const cacheKey = `npm:resolve:version:${pkg.raw}`;
  if (options.cache[cacheKey]) {
    debug('resolve hit cache: %s', cacheKey);
    return options.cache[cacheKey];
  }

  let realPkgVersion;
  let spec = pkg.spec;
  if (spec === '*') {
    spec = 'latest';
  }
  const distTags = packageMeta['dist-tags'];
  // try tag first
  realPkgVersion = distTags[spec];

  if (!realPkgVersion) {
    const version = semver.valid(spec);
    const range = semver.validRange(spec);
    if (semver.satisfies(distTags.latest, spec)) {
      realPkgVersion = distTags.latest;
    } else if (version) {
      realPkgVersion = version;
    } else if (range) {
      realPkgVersion = semver.maxSatisfying(packageMeta.allVersions, range);
    }
  }

  if (!realPkgVersion) {
    throw new Error(`[${pkg.displayName}] Can\'t find package ${pkg.name}@${pkg.rawSpec}`);
  }

  const realPkg = packageMeta.versions[realPkgVersion];
  if (!realPkg) {
    throw new Error(`[${pkg.displayName}] Can\'t find package ${pkg.name}\'s version: ${realPkgVersion}`);
  }

  debug('[%s@%s] spec: %s, real version: %s, dist-tags: %j',
    pkg.name, pkg.rawSpec, pkg.spec, realPkg.version, distTags);

  // cache resolve result
  options.cache[cacheKey] = realPkg;
  return realPkg;
}

function* getFullPackageMeta(name, options) {
  if (name[0] === '@') {
    // dont encodeURIComponent @ char, it will be 405
    // https://registry.npmjs.org/%40rstacruz%2Ftap-spec/%3E%3D4.1.1
    name = '@' + utility.encodeURIComponent(name.substring(1));
  }
  const pkgUrl = url.resolve(options.registry, name);
  const result = yield get(pkgUrl, {
    headers: {
      accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
    },
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
  }, options);
  options.totalJSONSize += result.res.size;
  options.totalJSONCount += 1;
  return result.data;
}

function* download(pkg, options) {
  const ungzipDir = options.ungzipDir || utils.getPackageStorePath(options.storeDir, pkg);
  const donefile = path.join(ungzipDir, '.npminstall.done');

  // make sure only one download for a version
  const key = `download:${pkg.name}@${pkg.version}`;
  if (options.cache[key]) {
    // wait download finish
    if (!options.cache[key].done) {
      const err = yield options.events.await(key);
      if (err) {
        throw err;
      }
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
    options.events.emit(key);
    // debug('[%s@%s] Exists', pkg.name, pkg.version);
    return {
      exists: true,
      dir: ungzipDir,
    };
  }

  yield utils.mkdirp(ungzipDir);

  let lastErr;
  let count = 0;
  while (count < 3) {
    try {
      const stream = yield getTarballStream(pkg, options);
      let useTarFormat = false;
      if (count === 1 && lastErr && lastErr.code === 'Z_DATA_ERROR') {
        options.console.warn(`[${pkg.name}@${pkg.version}] tgz format ungzip error, try to use tar format`);
        useTarFormat = true;
      }
      yield checkShasumAndUngzip(ungzipDir, stream, pkg, useTarFormat);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      // retry download on shasum error or server 50x error
      if (err.name === 'ShasumNotMatchError' || err.code === 'Z_DATA_ERROR' || err.status >= 500) {
        count++;
        options.console.warn(`[${pkg.name}@${pkg.version}] download %s: %s, fail count: %s`,
          err.name, err.message, count);
        // sleep for a while to wait for server become normal
        if (count < 3) {
          yield utils.sleep(count * 500);
        }
      } else {
        break;
      }
    }
  }
  if (lastErr) {
    options.events.emit(key, lastErr);
    throw lastErr;
  }

  // read package.json to merge into realPkg
  const fullMeta = yield utils.readPackageJSON(ungzipDir);
  Object.assign(pkg, fullMeta);

  yield fs.writeFile(donefile, Date());

  const pkgMeta = {
    _from: `${pkg.name}@${pkg.version}`,
    _resolved: pkg.dist.tarball,
  };
  const binaryMirror = options.binaryMirrors[pkg.name];
  if (binaryMirror) {
    // node-pre-gyp
    if (pkg.scripts && pkg.scripts.install) {
      // leveldown and sqlite3
      // nodegit
      if (/prebuild --install/.test(pkg.scripts.install) ||
          /prebuild --download/.test(pkg.scripts.install) ||
          /node-pre-gyp install/.test(pkg.scripts.install) ||
          pkg.name === 'nodegit' ||
          pkg.name === 'fsevents') {
        const newBinary = pkg.binary || {};
        for (const key in binaryMirror) {
          newBinary[key] = binaryMirror[key];
        }
        pkgMeta.binary = newBinary;
        // ignore https protocol check on: node_modules/node-pre-gyp/lib/util/versioning.js
        if (/node-pre-gyp install/.test(pkg.scripts.install)) {
          const versioningFile = path.join(ungzipDir, 'node_modules/node-pre-gyp/lib/util/versioning.js');
          if (yield fs.exists(versioningFile)) {
            let content = yield fs.readFile(versioningFile, 'utf-8');
            content = content.replace('if (protocol === \'http:\') {',
              'if (false && protocol === \'http:\') { // hack by npminstall');
            yield fs.writeFile(versioningFile, content);
          }
        }
        options.console.info('%s download from binary mirror: %j',
          chalk.gray(`${pkg.name}@${pkg.version}`), newBinary);
      }
    } else if ((binaryMirror.replaceHost && binaryMirror.host) || binaryMirror.replaceHostMap) {
      // use mirror url instead
      // e.g.: pngquant-bin
      const indexFilepath = path.join(ungzipDir, 'lib/index.js');
      yield replaceHostInFile(pkg, indexFilepath, binaryMirror, options);
      const installFilepath = path.join(ungzipDir, 'lib/install.js');
      yield replaceHostInFile(pkg, installFilepath, binaryMirror, options);
    }
  }

  if (pkg.name === 'node-pre-gyp') {
    // ignore https protocol check on: lib/util/versioning.js
    const versioningFile = path.join(ungzipDir, 'lib/util/versioning.js');
    if (yield fs.exists(versioningFile)) {
      let content = yield fs.readFile(versioningFile, 'utf-8');
      content = content.replace('if (protocol === \'http:\') {',
        'if (false && protocol === \'http:\') { // hack by npminstall');
      yield fs.writeFile(versioningFile, content);
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
  let tarballUrl = pkg.dist.tarball;
  let formatRedirectUrl;
  if (options.formatNpmTarbalUrl) {
    tarballUrl = options.formatNpmTarbalUrl(tarballUrl);
    formatRedirectUrl = function(from, to) {
      return options.formatNpmTarbalUrl(urlresolve(from, to));
    };
  }

  if (!options.cacheDir || utils.isSudo()) {
    // sudo don't touch the cacheDir
    // production mode
    debug('[%s@%s] GET streaming %j', pkg.name, pkg.version, tarballUrl);
    const result = yield get(tarballUrl, {
      timeout: options.timeout,
      followRedirect: true,
      formatRedirectUrl,
      streaming: true,
    }, options);

    if (result.status !== 200) {
      destroy(result.res);
      throw new Error(`Download ${tarballUrl} status: ${result.status} error, should be 200`);
    }

    // record size
    result.res.on('data', chunk => {
      options.totalTarballSize += chunk.length;
    });
    return result.res;
  }

  // multi process problems
  let paths = [ options.cacheDir ];
  let name = pkg.name;
  if (name[0] === '@') {
    name = name.split('/')[1];
  }
  paths = paths.concat(name.toLowerCase().replace(/[-_.]/g, '').split('', 4));
  paths.push(pkg.name);
  const parentDir = path.join.apply(path, paths);
  const tarballFile = path.join(parentDir, `${pkg.version}-${pkg.dist.shasum}.tgz`);
  let exists = yield fs.exists(tarballFile);
  if (!exists) {
    // try to remove expired tmp dirs
    // last year
    const lastYearTmpDir = path.join(options.cacheDir, '.tmp', moment().subtract(1, 'years').format('YYYY'));
    // last month
    const lastMonthTmpDir = path.join(options.cacheDir, '.tmp', moment().subtract(1, 'months').format('YYYY/MM'));
    const dirs = [ lastYearTmpDir, lastMonthTmpDir ];
    for (const dir of dirs) {
      try {
        yield utils.rimraf(dir);
      } catch (err) {
        options.console.warn('Remove tmp dir %s error: %s, ignore it', dir, err);
      }
    }
    const tmpDir = path.join(options.cacheDir, '.tmp', moment().format('YYYY/MM/DD'));
    yield utils.mkdirp(parentDir);
    yield utils.mkdirp(tmpDir);
    const tmpFile = path.join(tmpDir, `${name}-${pkg.version}-${uuid.v4()}.tgz`);
    const result = yield get(tarballUrl, {
      timeout: options.timeout,
      followRedirect: true,
      formatRedirectUrl,
      writeStream: fs.createWriteStream(tmpFile),
    }, options);

    if (result.status !== 200) {
      throw new Error(`Download ${tarballUrl} status: ${result.status} error, should be 200`);
    }
    // make sure tarball file is not exists again
    exists = yield fs.exists(tarballFile);
    if (!exists) {
      try {
        yield fs.rename(tmpFile, tarballFile);
      } catch (err) {
        if (err.code === 'EPERM') {
          // Error: EPERM: operation not permitted, rename
          exists = yield fs.exists(tarballFile);
          if (exists) {
            // parallel execution case same file exists, ignore rename error
            // clean tmpFile
            yield fs.unlink(tmpFile);
          } else {
            // rename error
            throw err;
          }
        } else {
          // rename error
          throw err;
        }
      }
    } else {
      // clean tmpFile
      yield fs.unlink(tmpFile);
    }
    const stat = yield fs.stat(tarballFile);
    debug('[%s@%s] saved %s %s => %s',
      pkg.name, pkg.version, bytes(stat.size), tarballUrl, tarballFile);
    options.totalTarballSize += stat.size;
  }

  const stream = fs.createReadStream(tarballFile);
  stream.tarballFile = tarballFile;
  return stream;
}

function checkShasumAndUngzip(ungzipDir, readstream, pkg, useTarFormat) {
  return function(callback) {
    const shasum = pkg.dist.shasum;
    const hash = crypto.createHash('sha1');
    const extracter = tar.Extract({ path: ungzipDir, strip: 1 });

    function handleCallback(err) {
      if (err) {
        // make sure readstream will be destroy
        destroy(readstream);
        err.message += ` (${pkg.name}@${pkg.version})`;
        if (readstream.tarballFile && fs.existsSync(readstream.tarballFile)) {
          err.message += ` (${readstream.tarballFile})`;
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
        const err = new Error(`real sha1:${realShasum} not equal to remote:${shasum}`);
        err.name = 'ShasumNotMatchError';
        handleCallback(err);
      }
    });

    extracter.on('end', handleCallback);
    readstream.on('error', handleCallback);
    extracter.on('error', handleCallback);

    if (useTarFormat) {
      readstream.pipe(extracter);
    } else {
      const gunzip = zlib.createGunzip();
      gunzip.on('error', handleCallback);
      readstream.pipe(gunzip).pipe(extracter);
    }
  };
}

function* replaceHostInFile(pkg, filepath, binaryMirror, options) {
  const exists = yield fs.exists(filepath);
  if (!exists) {
    return;
  }

  let content = yield fs.readFile(filepath, 'utf8');
  let replaceHostMap = binaryMirror.replaceHostMap;
  if (!replaceHostMap) {
    let replaceHosts = binaryMirror.replaceHost;
    if (!Array.isArray(replaceHosts)) {
      replaceHosts = [ replaceHosts ];
    }
    replaceHostMap = {};
    for (const replaceHost of replaceHosts) {
      replaceHostMap[replaceHost] = binaryMirror.host;
    }
  }
  for (const replaceHost in replaceHostMap) {
    content = content.replace(replaceHost, replaceHostMap[replaceHost]);
  }
  debug('%s: \n%s', filepath, content);
  yield fs.writeFile(filepath, content);
  options.console.info('%s download from mirrors: %j, changed file: %s',
    chalk.gray(`${pkg.name}@${pkg.version}`),
    replaceHostMap,
    filepath);
}
