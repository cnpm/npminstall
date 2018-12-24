'use strict';

const debug = require('debug')('npminstall:download:npm');
const bytes = require('bytes');
const fs = require('mz/fs');
const path = require('path');
const crypto = require('crypto');
const tar = require('tar');
const zlib = require('zlib');
const destroy = require('destroy');
const urlresolve = require('url').resolve;
const chalk = require('chalk');
const uuid = require('uuid');
const moment = require('moment');
const os = require('os');
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
  const dependenciesTree = options.cache.dependenciesTree;
  // check cache first
  if (dependenciesTree[pkg.raw]) {
    debug('resolve hit dependencies cache: %s', pkg.raw);
    return dependenciesTree[pkg.raw];
  }

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

  let spec = pkg.spec;
  if (spec === '*') {
    spec = 'latest';
  }

  const distTags = packageMeta['dist-tags'];
  let realPkgVersion = utils.findMaxSatisfyingVersion(spec, distTags, packageMeta.allVersions);
  let fixDependencies;

  if (!realPkgVersion) {
    throw new Error(`[${pkg.displayName}] Can\'t find package ${pkg.name}@${pkg.rawSpec}`);
  }

  if (options.autoFixVersion) {
    const fixVersion = options.autoFixVersion(pkg.name, realPkgVersion);
    if (fixVersion) {
      if (fixVersion.version && fixVersion.version !== realPkgVersion) {
        options.console.warn(`[${pkg.name}@${realPkgVersion}] use ${pkg.name}@${chalk.green(fixVersion.version)} instead, reason: ${chalk.yellow(fixVersion.reason)}`);
        realPkgVersion = fixVersion.version;
      }
      if (fixVersion.dependencies) {
        options.console.warn(`[${pkg.name}@${realPkgVersion}] use dependencies: ${chalk.green(JSON.stringify(fixVersion.dependencies))} instead, reason: ${chalk.yellow(fixVersion.reason)}`);
        fixDependencies = fixVersion.dependencies;
      }
    }
  }

  const realPkg = packageMeta.versions[realPkgVersion];
  if (!realPkg) {
    throw new Error(`[${pkg.displayName}] Can\'t find package ${pkg.name}\'s version: ${realPkgVersion}`);
  }

  if (fixDependencies) {
    realPkg.__fixDependencies = fixDependencies;
  }

  debug('[%s@%s] spec: %s, real version: %s, dist-tags: %j',
    pkg.name, pkg.rawSpec, pkg.spec, realPkg.version, distTags);

  // cache resolve result
  dependenciesTree[pkg.raw] = realPkg;
  return realPkg;
}

function* getFullPackageMeta(name, options) {
  const pkgUrl = utils.formatPackageUrl(options.registry, name);
  const result = yield get(pkgUrl, {
    headers: {
      accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
    },
    timeout: options.timeout,
    followRedirect: true,
    gzip: true,
    dataType: 'json',
  }, options);
  options.totalJSONSize += result.res.size;
  options.totalJSONCount += 1;
  return result.data;
}

function* download(pkg, options) {
  const ungzipDir = options.ungzipDir || utils.getPackageStorePath(options.storeDir, pkg);

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

  if (yield utils.isInstallDone(ungzipDir)) {
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
  const tarballUrls = utils.parseTarballUrls(pkg.dist.tarball);
  let tarballUrlIndex = 0;
  let tarballUrl;
  while (count < 3) {
    tarballUrl = tarballUrls[tarballUrlIndex++];
    if (!tarballUrl) {
      tarballUrlIndex = 0;
      tarballUrl = tarballUrls[tarballUrlIndex];
    }
    try {
      const stream = yield getTarballStream(tarballUrl, pkg, options);
      let useTarFormat = false;
      if (count === 1 && lastErr && lastErr.code === 'Z_DATA_ERROR') {
        options.console.warn(`[${pkg.name}@${pkg.version}] format ungzip error, try to use tar format`);
        useTarFormat = true;
      }
      yield checkShasumAndUngzip(ungzipDir, stream, pkg, useTarFormat, options);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      count++;
      options.console.warn(`[${pkg.name}@${pkg.version}] download %s: %s, fail count: %s`,
        err.name, err.message, count);
      // retry download on any error
      // sleep for a while to wait for server become normal
      if (count < 3) {
        yield utils.sleep(count * 500);
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
  if (pkg.__fixDependencies) {
    pkg.dependencies = Object.assign({}, pkg.dependencies, pkg.__fixDependencies);
  }

  yield utils.setInstallDone(ungzipDir);

  const pkgMeta = {
    _from: `${pkg.name}@${pkg.version}`,
    _resolved: pkg.dist.tarball,
  };
  const binaryMirror = options.binaryMirrors[pkg.name];
  if (binaryMirror) {
    // node-pre-gyp
    if (pkg.scripts && pkg.scripts.install && !binaryMirror.replaceHostFiles) {
      // leveldown and sqlite3
      // nodegit
      if (/prebuild --install/.test(pkg.scripts.install) ||
          /prebuild --download/.test(pkg.scripts.install) ||
          /node-pre-gyp install/.test(pkg.scripts.install) ||
          // utf-8-validate
          /prebuild-install || node-gyp rebuild/.test(pkg.scripts.install) ||
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
      // https://github.com/lovell/sharp/blob/master/install/libvips.js#L19
      const replaceHostFiles = binaryMirror.replaceHostFiles || [
        'lib/index.js',
        'lib/install.js',
      ];
      for (const replaceHostFile of replaceHostFiles) {
        const replaceHostFilePath = path.join(ungzipDir, replaceHostFile);
        yield replaceHostInFile(pkg, replaceHostFilePath, binaryMirror, options);
      }
    }

    // replace cypress download url
    // https://github.com/cypress-io/cypress/blob/master/cli/lib/tasks/download.js#L30
    if (pkg.name === 'cypress') {
      const platforms = binaryMirror.platforms || {
        darwin: 'osx64',
        linux: 'linux64',
        win32: 'win64',
      };
      const targetPlatform = platforms[os.platform()];
      if (targetPlatform) {
        options.console.info('%s download from binary mirror: %j, targetPlatform: %s',
          chalk.gray(`${pkg.name}@${pkg.version}`), binaryMirror, targetPlatform);
        const downloadFile = path.join(ungzipDir, 'lib/tasks/download.js');
        if (yield fs.exists(downloadFile)) {
          let content = yield fs.readFile(downloadFile, 'utf-8');
          // return version ? prepend('desktop/' + version) : prepend('desktop');
          const afterContent = 'return "' + binaryMirror.host + '/" + version + "/' + targetPlatform + '/cypress.zip"; // hack by npminstall\n';
          content = content
            .replace('return version ? prepend(\`desktop/${version}\`) : prepend(\'desktop\')', afterContent)
            .replace('return version ? prepend(\'desktop/\' + version) : prepend(\'desktop\');', afterContent);
          yield fs.writeFile(downloadFile, content);
        }
      }
    } else if (pkg.name === 'vscode') {
      // https://github.com/Microsoft/vscode-extension-vscode/blob/master/bin/install#L64
      const indexFilepath = path.join(ungzipDir, 'bin/install');
      yield replaceHostInFile(pkg, indexFilepath, binaryMirror, options);
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

function* getTarballStream(tarballUrl, pkg, options) {
  let formatRedirectUrl;
  if (options.formatNpmTarbalUrl) {
    tarballUrl = options.formatNpmTarbalUrl(tarballUrl);
    formatRedirectUrl = function(from, to) {
      return options.formatNpmTarbalUrl(urlresolve(from, to));
    };
  }

  // high speed store
  if (options.highSpeedStore) {
    try {
      const stream = yield options.highSpeedStore.getStream(tarballUrl);
      if (stream) {
        // record size
        stream.on('data', chunk => {
          options.totalTarballSize += chunk.length;
        });
        return stream;
      }
    } catch (err) {
      options.console.warn('[npminstall:download:npm] highSpeedStore.get %s error: %s', tarballUrl, err);
      options.console.warn(err.stack);
    }
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
    const dirs = [];
    for (let i = 1; i <= 3; i++) {
      // year
      dirs.push(path.join(options.cacheDir, '.tmp', moment().subtract(i, 'years').format('YYYY')));
      // month
      dirs.push(path.join(options.cacheDir, '.tmp', moment().subtract(i, 'months').format('YYYY/MM')));
    }
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

function toMap(arr) {
  const m = {};
  for (const a of arr) {
    m[a] = true;
  }
  return m;
}

// https://github.com/tj/node-prune/blob/master/prune.go#L17
const defaultFiles = toMap([
  'Makefile',
  'Gruntfile.js',
  '.DS_Store',
  '.tern-project',
  '.gitattributes',
  '.editorconfig',
  '.eslintrc',
  'eslint',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintignore',
  '.stylelintrc',
  'stylelint.config.js',
  '.stylelintrc.json',
  '.stylelintrc.yaml',
  '.stylelintrc.yml',
  '.stylelintrc.js',
  '.htmllintrc',
  'htmllint.js',
  '.lint',
  '.npmignore',
  '.jshintrc',
  '.flowconfig',
  '.documentup.json',
  '.yarn-metadata.json',
  '.travis.yml',
  'appveyor.yml',
  '.gitlab-ci.yml',
  'circle.yml',
  '.coveralls.yml',
  'CHANGES',
  'changelog',
  'ChangeLog',
  'TODO',
  'LICENSE.txt',
  'LICENSE',
  'LICENSE-MIT',
  'LICENSE.BSD',
  'license',
  'License',
  'PATENTS',
  'AUTHORS',
  'CONTRIBUTORS',
  '.mailmap',
  '.yarn-integrity',
  '.yarnclean',
  '_config.yml',
  '.babelrc',
  '.yo-rc.json',
  'jest.config.js',
  'karma.conf.js',
  '.appveyor.yml',
  'tsconfig.json',
  '.zuul.yml',
  '.jscs.json',
  '.jscsrc',
  '.autod.conf.js',
  '.jshintignore',
  '.nvmrc',
]);

const defaultDirectories = toMap([
  '__tests__',
  'test',
  'tests',
  'powered-test',
  'docs',
  'doc',
  '.idea',
  '.vscode',
  'website',
  'images',
  'example',
  'examples',
  'coverage',
  '.nyc_output',
  '.circleci',
  '.github',
]);

const defaultExtensions = toMap([
  '.markdown',
  '.md',
  '.mkd',
  '.ts',
  '.jst',
  '.coffee',
  '.tgz',
  '.swp',
]);

function checkShasumAndUngzip(ungzipDir, readstream, pkg, useTarFormat, options) {
  return function(callback) {
    const shasum = pkg.dist.shasum;
    const hash = crypto.createHash('sha1');
    const opts = {
      cwd: ungzipDir,
      strip: 1,
      onentry(entry) {
        if (entry.type.toLowerCase() === 'file') {
          /* eslint-disable no-bitwise */
          entry.mode = (entry.mode || 0) | 0o644;
        }
        if (entry.type.toLowerCase() === 'directory') {
          /* eslint-disable no-bitwise */
          entry.mode = (entry.mode || 0) | 0o755;
        }
      },
    };
    if (options.prune) {
      opts.filter = function(filepath, entry) {
        options.rawCount++;
        options.rawSize += entry.size;
        const filename = path.basename(filepath);
        if (defaultFiles[filename]) {
          options.pruneCount++;
          options.pruneSize += entry.size;
          return false;
        }
        const extname = path.extname(filename);
        if (defaultExtensions[extname]) {
          options.pruneCount++;
          options.pruneSize += entry.size;
          return false;
        }
        // package/foo/bar/zoo
        const dirname = filepath.split('/', 3)[1];
        if (defaultDirectories[dirname]) {
          options.pruneCount++;
          options.pruneSize += entry.size;
          return false;
        }
        return true;
      };
    }
    const extracter = tar.extract(opts);

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
  let replaceHostMap;
  // support RegExp string
  if (binaryMirror.replaceHostRegExpMap) {
    replaceHostMap = binaryMirror.replaceHostRegExpMap;
    for (const replaceHost in replaceHostMap) {
      const replaceAllRE = new RegExp(replaceHost, 'g');
      const targetHost = replaceHostMap[replaceHost];
      debug('replace %j(%s) => %s', replaceHost, replaceAllRE, targetHost);
      content = content.replace(replaceAllRE, targetHost);
    }
  } else {
    replaceHostMap = binaryMirror.replaceHostMap;
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
  }
  debug('%s: \n%s', filepath, content);
  yield fs.writeFile(filepath, content);
  options.console.info('%s download from mirrors: %j, changed file: %s',
    chalk.gray(`${pkg.name}@${pkg.version}`),
    replaceHostMap,
    filepath);
}
