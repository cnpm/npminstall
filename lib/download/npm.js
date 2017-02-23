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

const RANGE_RE = /^>=/;

module.exports = function* (pkg, options) {
  const realPkg = yield resolve(pkg, options);
  // download tarball and unzip
  const info = yield download(realPkg, options);
  info.package = realPkg;
  return info;
};

module.exports.resolve = resolve;

function* resolve(pkg, options) {
  // check cache first
  const cacheKey = `npm:resolve:${pkg.raw}`;
  if (options.cache[cacheKey]) {
    debug('resolve hit cache: %s', cacheKey);
    return options.cache[cacheKey];
  }
  // get npm package info
  const pkgUrl = getPackageNpmUri(pkg, options);
  let result;
  let realPkg;
  try {
    result = yield get(pkgUrl, {
      dataType: 'json',
      timeout: options.timeout,
      followRedirect: true,
      gzip: true,
    }, options);
    options.totalJSONSize += result.res.size;
    options.totalJSONCount += 1;
    realPkg = result.data;
  } catch (err) {
    // GET https://registry.npmjs.com/@rstacruz%2Ftap-spec/latest response 401 status
    // Need https://github.com/npm/registry/issues/34 to be fixed
    if (err.status === 401) {
      realPkg = yield getMatchPackageFromAll(pkg, options);
    } else {
      err.message = `[${pkg.displayName}] ${err.message}`;
      throw err;
    }
  }

  if (pkg.type === 'range' && RANGE_RE.test(pkg.spec)) {
    const distTags = realPkg['dist-tags'];
    if (distTags && (distTags.latest === realPkg.version || !semver.satisfies(distTags.latest, pkg.spec))) {
      debug('hit match version: %s, distTags: %j', realPkg.version, distTags);
    } else {
      // need to fetch latest version
      // make sure only get once
      let latestPackage = options.latestPackages.get(realPkg.name);
      if (!latestPackage) {
        const latestUrl = getPackageNpmUri({
          name: pkg.name,
          spec: 'latest',
        }, options);
        result = yield get(latestUrl, {
          dataType: 'json',
          timeout: options.timeout,
          followRedirect: true,
          gzip: true,
        }, options);
        options.totalJSONSize += result.res.size;
        options.totalJSONCount += 1;
        latestPackage = result.data;
        if (latestPackage && latestPackage.version && latestPackage.name) {
          options.latestPackages.set(realPkg.name, latestPackage);
          debug('get %s latest version: %s, satisfies %s: %s',
            latestPackage.name, latestPackage.version, pkg.spec, semver.satisfies(latestPackage.version, pkg.spec));
        } else {
          options.console.warn(`[${realPkg.name}@latest] latest version package format error: %j`, latestPackage);
          latestPackage = null;
        }
      }

      // if latest package exists and satisfies spec, use latest package instead
      if (latestPackage && latestPackage.latest !== realPkg.version && semver.satisfies(latestPackage.version, pkg.spec)) {
        debug('use latest version %s instead of range version %s', latestPackage.version, realPkg.version);
        realPkg = latestPackage;
      }
    }
  }

  debug('[%s@%s] spec: %s, real version: %s', pkg.name, pkg.version, pkg.spec, realPkg.version);

  // cache resolve result
  options.cache[cacheKey] = realPkg;

  return realPkg;
}

function getPackageNpmUri(pkg, options) {
  let name = pkg.name;
  let spec = pkg.spec;
  if (name[0] === '@') {
    // dont encodeURIComponent @ char, it will be 405
    // https://registry.npmjs.org/%40rstacruz%2Ftap-spec/%3E%3D4.1.1
    name = '@' + utility.encodeURIComponent(name.substring(1));
    // why scoped do this? because npmjs.com scoped dont support request with tag
    // GET https://registry.npmjs.com/@rstacruz%2Ftap-spec/latest response 401 status
    // Need https://github.com/npm/registry/issues/34 to be fixed
    if (spec === 'latest') {
      spec = '*';
    }
  } else {
    name = utility.encodeURIComponent(name);
    // use latest instead of *
    if (spec === '*') {
      spec = 'latest';
    }
  }
  const pkgUrl = url.resolve(options.registry, name + '/' + utility.encodeURIComponent(spec));
  debug('[%s@%s] GET %j', pkg.name, pkg.spec, pkgUrl);
  return pkgUrl;
}

function* getMatchPackageFromAll(pkg, options) {
  let name = pkg.name;
  const spec = pkg.spec;
  if (name[0] === '@') {
    // dont encodeURIComponent @ char, it will be 405
    // https://registry.npmjs.org/%40rstacruz%2Ftap-spec/%3E%3D4.1.1
    name = '@' + utility.encodeURIComponent(name.substring(1));
  }
  const pkgUrl = url.resolve(options.registry, name);
  const result = yield get(pkgUrl, {
    dataType: 'json',
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
  }, options);
  options.totalJSONSize += result.res.size;
  options.totalJSONCount += 1;
  const all = result.data;

  // fetch with range won't get 401, only need to match tag and version
  // https://registry.npmjs.org/@rstacruz%2Ftap-spec/%3E%3D4.1.1
  const tags = all['dist-tags'];
  // hit tag
  if (tags[spec]) {
    return all.versions[tags[spec]];
  }
  const realPkg = all.versions[spec];
  if (!realPkg) {
    const err = new Error(`${pkg.name}@${pkg.spec} not found`);
    err.status = 404;
    throw err;
  }
  return realPkg;
}

function* download(pkg, options) {
  const ungzipDir = options.ungzipDir || utils.getPackageStorePath(options.storeDir, pkg);
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
    throw lastErr;
  }

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
    } else if (binaryMirror.replaceHost && binaryMirror.host) {
      // use mirror url instead
      const indexFilepath = path.join(ungzipDir, 'lib/index.js');
      if (yield fs.exists(indexFilepath)) {
        let content = yield fs.readFile(indexFilepath, 'utf8');
        let replaceHosts = binaryMirror.replaceHost;
        if (!Array.isArray(replaceHosts)) {
          replaceHosts = [ replaceHosts ];
        }
        for (const replaceHost of replaceHosts) {
          content = content.replace(replaceHost, binaryMirror.host);
        }
        debug('%s: \n%s', indexFilepath, content);
        yield fs.writeFile(indexFilepath, content);
        options.console.info('%s download from %s instead of %s',
          chalk.gray(`${pkg.name}@${pkg.version}`), binaryMirror.host, binaryMirror.replaceHost);
      }
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
