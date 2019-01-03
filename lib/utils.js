'use strict';

const debug = require('debug')('npminstall:utils');
const fs = require('mz/fs');
const path = require('path');
const cp = require('child_process');
const urlparse = require('url').parse;
const querystring = require('querystring');

require('./patch_buffer');
const tar = require('tar');

const zlib = require('zlib');
const _rimraf = require('rimraf');
const _mkdirp = require('mkdirp');
const runscript = require('runscript');
const homedir = require('node-homedir');
const fse = require('co-fs-extra');
const destroy = require('destroy');
const normalizeData = require('normalize-package-data');
const semver = require('semver');
const utility = require('utility');
const url = require('url');
const config = require('./config');
const get = require('./get');

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

exports.readPackageJSON = function* readPackageJSON(root) {
  const pkg = yield exports.readJSON(path.join(root, 'package.json'));
  normalizeData(pkg);
  return pkg;
};

const INSTALL_DONE_KEY = '__npminstall_done';

// 设置 pkg 安装完成的标记
exports.setInstallDone = function* setInstallDone(pkgRoot) {
  yield exports.addMetaToJSONFile(path.join(pkgRoot, 'package.json'), {
    [INSTALL_DONE_KEY]: Date(),
  });
};

exports.unsetInstallDone = function* setInstallDone(pkgRoot) {
  yield exports.addMetaToJSONFile(path.join(pkgRoot, 'package.json'), {
    [INSTALL_DONE_KEY]: false,
  });
};

// 判断 pkg 是否已经安装完成
exports.isInstallDone = function* isInstallDone(pkgRoot) {
  const pkg = yield exports.readJSON(path.join(pkgRoot, 'package.json'));
  return !!pkg[INSTALL_DONE_KEY];
};

exports.addMetaToJSONFile = function* (filepath, meta) {
  yield fs.chmod(filepath, '644');
  const pkg = yield exports.readJSON(filepath);
  for (const key in meta) {
    pkg[key] = meta[key];
  }
  yield fs.writeFile(filepath, JSON.stringify(pkg, null, 2));
};

exports.mkdirp = function mkdirp(dir, mod) {
  return new Promise((resolve, reject) => {
    _mkdirp(dir, mod, err => {
      err ? reject(err) : resolve();
    });
  });
};

exports.rimraf = function rimraf(dir) {
  return new Promise((resolve, reject) => {
    _rimraf(dir, err => {
      err ? reject(err) : resolve();
    });
  });
};

exports.relative = function relative(src, dest) {
  // Windows don't support relative path
  if (process.platform === 'win32') return src;
  return path.relative(path.dirname(dest), src);
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

  const destDir = path.dirname(dest);
  // check if destDir is not exist
  if (!(yield fs.exists(destDir))) {
    yield exports.mkdirp(destDir);
  }

  yield exports.rimraf(dest);
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

function setNpmPackageEnv(env, key, value) {
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    env[`npm_package_${key}`] = value;
  } else if (value === null) {
    env[`npm_package_${key}`] = 'null';
  } else if (value) {
    for (const subkey in value) {
      setNpmPackageEnv(env, `${key}_${subkey}`, value[subkey]);
    }
  }
}

exports.formatPackageUrl = function formatUrl(registry, name) {
  if (name[0] === '@') {
    // dont encodeURIComponent @ char, it will be 405
    // https://registry.npmjs.com/%40rstacruz%2Ftap-spec/%3E%3D4.1.1
    name = '@' + utility.encodeURIComponent(name.substring(1));
  }
  const parsed = url.parse(registry);
  if (parsed.pathname.endsWith('/')) {
    parsed.pathname += name;
  } else {
    parsed.pathname += `/${name}`;
  }
  return url.format(parsed);
};

exports.parseTarballUrls = function parseTarballUrls(tarball) {
  const urls = [ tarball ];
  const parsed = urlparse(tarball);
  const query = parsed.query && querystring.parse(parsed.query);
  if (query && query.other_urls) {
    const otherUrls = query.other_urls.split(',');
    for (const url of otherUrls) {
      urls.push(url);
    }
  }
  return urls;
};

/*
 * Runs an npm script.
 */

exports.runScript = function* runScript(pkgDir, script, options) {
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

  // set npm_package_* env from package.json
  const pkg = yield exports.readJSON(path.join(pkgDir, 'package.json'));
  for (const key in pkg) {
    setNpmPackageEnv(env, key, pkg[key]);
  }

  env.PATH = [
    path.join(__dirname, '../node-gyp-bin'),
    path.join(options.root, 'node_modules', '.bin'),
    path.join(pkgDir, 'node_modules', '.bin'),
    process.env.PATH,
  ].join(path.delimiter);

  // replace `npm install xxx` to `npminstall xxx`
  const NPM_INSTALL_RE = /^npm (i|install) /;
  if (NPM_INSTALL_RE.test(script)) {
    const npminstall = path.join(__dirname, '../bin/install.js');
    const newScript = script.replace(NPM_INSTALL_RE, `${process.execPath} ${npminstall} `);
    options.console.info('[npminstall:runScript] replace %j to %j', script, newScript);
    script = newScript;
  }

  // ignore npm ls error
  // e.g.: npm ERR! extraneous: base64-js@1.1.2
  let ignoreError = false;
  if (/^npm (ls|list)$/.test(script)) {
    ignoreError = true;
  }

  try {
    return yield runscript(script, {
      cwd: pkgDir,
      env,
      stdio: 'inherit',
    });
  } catch (err) {
    if (ignoreError) {
      options.console.info('[npminstall:runScript] ignore runscript error: %s', err);
    } else {
      throw err;
    }
  }
};

exports.getMaxRange = function(spec) {
  // >=1.0.0 <2.0.0
  const r = /^>=.*?<(.*?)$/.exec(spec);
  if (r) {
    return r[1];
  }
};

exports.findMaxSatisfyingVersion = function(spec, distTags, allVersions) {
  // try tag first
  let realPkgVersion = distTags[spec];

  if (!realPkgVersion) {
    const version = semver.valid(spec);
    const range = semver.validRange(spec);
    if (semver.satisfies(distTags.latest, spec)) {
      realPkgVersion = distTags.latest;
    } else if (version) {
      // use the valid version
      realPkgVersion = version;
    } else if (range) {
      realPkgVersion = semver.maxSatisfying(allVersions, range);
      if (realPkgVersion) {
        // try to use latest-{major} tag version on range
        // ^1.0.1 =range=> get 1.0.3 in (1.0.2, 1.0.3), but latest-1 tag is 1.0.2
        // finnaly we should use 1.0.2 on ^1.0.1
        const major = semver.major(realPkgVersion);
        if (major) {
          const latestMajorVersion = distTags[`latest-${major}`];
          if (latestMajorVersion && semver.satisfies(latestMajorVersion, spec)) {
            realPkgVersion = latestMajorVersion;
          }
        }
      }
    }
  }

  return realPkgVersion;
};

exports.getPackageStorePath = function(storeDir, pkg) {
  // name => _name@1.0.0@name
  // @scope/name => _@scope_name@1.0.0@scope/name
  // some packages need name: https://github.com/BenoitZugmeyer/eslint-plugin-html/blob/master/src/index.js#L24
  return path.join(storeDir, `_${pkg.name.replace(/\//g, '_')}@${pkg.version}@${pkg.name}`);
};

exports.unpack = function(readstream, target, pkg) {
  return new Promise((resolve, reject) => {
    const extracter = tar.extract({
      cwd: target,
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
    });
    const gunzip = zlib.createGunzip();
    const name = pkg.name || pkg.displayName || 'unknown package';

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
        debug(`failed to unpack ${name}: ${err}`);
        reject(err);
      } else {
        debug(`unpacked ${name}`);
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
  const realPkg = yield exports.readPackageJSON(src);
  if (!realPkg.name || !realPkg.version) {
    throw new Error(`package.json must contains name and version(${pkgpath})`);
  }

  const targetdir = options.ungzipDir || exports.getPackageStorePath(options.storeDir, realPkg);
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

  if (!(yield exports.isInstallDone(targetdir))) {
    yield fse.emptydir(targetdir);
    yield fse.copy(src, targetdir);
    yield exports.setInstallDone(targetdir);
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
    timeout: options.streamingTimeout || options.timeout,
    followRedirect: true,
    streaming: true,
  }, options);

  if (result.status !== 200) {
    destroy(result.res);
    throw new Error(`Download ${url} status: ${result.status} error, should be 200`);
  }
  return result.res;
};

function* getRemotePackage(name, registry, globalOptions) {
  const registries = [ registry ].concat([
    'https://registry.npm.taobao.org',
    'https://r.cnpmjs.org',
    'https://registry.npmjs.com',
  ]);
  let lastErr;
  let pkg;
  for (const registry of registries) {
    const binaryMirrorUrl = exports.formatPackageUrl(registry, name + '/latest');
    try {
      const res = yield get(binaryMirrorUrl, {
        dataType: 'json',
        followRedirect: true,
        // don't retry
        retry: 0,
      }, globalOptions);
      pkg = res.data;
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!pkg || process.env.NPMINSTALL_TEST_LOCAL_PKG) {
    console.warn('Get /%s/latest from %s error: %s', name, registry, lastErr && lastErr.stack);
    pkg = require(name + '/package.json');
  }
  return pkg;
}

exports.getBinaryMirrors = function* getBinaryMirrors(registry, globalOptions) {
  const pkg = yield getRemotePackage('binary-mirror-config', registry, globalOptions);
  return pkg.mirrors.china;
};

exports.getBugVersions = function* getBugVersions(registry, globalOptions) {
  const pkg = yield getRemotePackage('bug-versions', registry, globalOptions);
  return pkg.config['bug-versions'];
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
  return hasAnti;
};

exports.isSudo = () => {
  const effectiveUser = process.env.USER;
  const actualUser = process.env.SUDO_USER || process.env.USER;
  return effectiveUser === 'root' && actualUser !== 'root';
};

exports.sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

exports.formatPath = pathname => {
  if (pathname[0] === '~') {
    // convert '~/foo/path' => '$HOME/foo/path'
    pathname = homedir() + pathname.substring(1);
  }
  return pathname;
};

exports.fork = (moduleFile, args, options) => {
  options = options || {};
  options.stdio = options.stdio || [
    process.stdin,
    process.stdout,
    process.stderr,
    'ipc',
  ];
  return new Promise((resolve, reject) => {
    const child = cp.fork(moduleFile, args, options);
    child.on('exit', code => {
      if (code !== 0) {
        return reject(new Error(`Run ${moduleFile} ${args.join(' ')} exit ${code}`));
      }
      resolve();
    });
  });
};

exports.getGlobalPrefix = prefix => {
  if (!prefix) {
    try {
      prefix = cp.execSync('npm config get prefix').toString().trim();
    } catch (err) {
      throw new Error(`exec npm config get prefix ERROR: ${err.message}`);
    }
  }
  return exports.formatPath(prefix);
};

exports.getGlobalInstallMeta = prefix => {
  prefix = exports.getGlobalPrefix(prefix);
  const meta = {
    targetDir: prefix,
    binDir: prefix,
  };
  if (process.platform !== 'win32') {
    meta.targetDir = path.join(prefix, 'lib');
    meta.binDir = path.join(prefix, 'bin');
  }
  return meta;
};

exports.endsWithX = version => typeof version === 'string' && !!version.match(/^\d+\.(x|\d+\.x)$/);

exports.getDisplayName = (pkg, ancestors) => {
  return ancestors
    .map(ancestor => ancestor.displayName || ancestor)
    .concat([ `${pkg.name}@${pkg.version}` ])
    .join(' › ');
};
