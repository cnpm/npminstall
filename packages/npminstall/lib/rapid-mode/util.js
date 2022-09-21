'use strict';

const debug = require('debug')('npminstall:rapid');
const path = require('path');
const fs = require('fs');
const promisify = require('util').promisify;
const os = require('os');
const url = require('url');
const crypto = require('crypto');
const mapWorkspaces = require('@npmcli/map-workspaces');

const parser = require('yargs-parser');
const { NpmFsMode } = require('./npm_fs/constants');
const {
  NotSupportedError,
  FuseDeviceError,
} = require('./error');
const runscript = require('runscript');
const BlackHoleStream = require('black-hole-stream');
const normalize = require('npm-normalize-package-bin');
const {
  tarBucketsDir,
  baseRapidModeDir,
  nydusdBootstrapFile,
  nydusdMnt,
} = require('./constants');

const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);


// node_modules/a -> a
// node_mdoules/@mockscope/b -> @mockscope/b
function getPackagePath(dep) {
  if (dep[0].startsWith('node_modules/')) {
    return dep[0].substr(13);
  }
  return dep[0];
}

function getDisplayName(dep, mode = NpmFsMode.NPM) {
  const {
    name,
    version,
  } = dep;

  if (mode === NpmFsMode.NPMINSTALL) {
    return `_${name.replace(/\//g, '_')}@${version}@${name}`;
  }
  return `${name}@${version}`;
}

function wrapSudo(shScript) {
  const username = os.userInfo().username;
  if (username === 'root') {
    return shScript;
  }

  return `sudo ${shScript}`;
}

// 需要手动写入，保证 path 路径符合预期
async function createNydusdConfigFile(path) {
  await writeFile(path, JSON.stringify({
    device: {
      backend: {
        type: 'localfs',
        config: {
          dir: tarBucketsDir,
          readahead: false,
        },
      },
    },
    mode: 'direct',
    digest_validate: false, // skip entry shasum check
    iostats_files: false, // skip profile file generation
  }), 'utf8');
}

// rapid 强依赖 fuse，暂时只在 Linux/MacOS 下开放
async function shouldFuseSupport() {
  if (os.type() === 'Linux') {
    const fuse = '/dev/fuse';
    const sh = wrapSudo(`${process.execPath} -e "fs.closeSync(fs.openSync('${fuse}'))"`);
    console.info(`[npminstall] detect /dev/fuse: ${sh}`);

    try {
      await runscript(sh, {
        stdio: 'pipe',
        stdout: new BlackHoleStream(),
        stderr: new BlackHoleStream(),
      });
    } catch (e) {
      debug(e && e.stdio && e.stdio.stderr.toString());
      throw new FuseDeviceError();
    }
  }

  if (os.type() === 'Darwin') {
    if (!await exists('/Library/Filesystems/macfuse.fs/Contents/Resources/mount_macfuse')) {
      throw new NotSupportedError('install macFUSE first');
    } else {
      console.warn('[npminstall] rapid mode is supported on macOS **experimentally**');
    }
  }

  if (os.type() === 'Windows') {
    throw new NotSupportedError('you can use WSL2 to run rapid mode on Windows, see: https://docs.microsoft.com/en-us/windows/wsl/install');
  }
}

function parseTarballUrl(tarballUrl) {
  // /@mockscope/a/download/a-1.0.0.tgz ->
  // @mockscope/a/download/a-1.0.0 -> [ '@mockscope/a', 'a-1.0.0' ]
  const pathname = new url.URL(tarballUrl).pathname.substr(1).slice(0, -4);
  // @mockscope/a/download/a-1.0.0 -> [ '@mockscope/a', 'a-1.0.0' ]
  // @mockscope/a/-/a-1.0.0 -> [ '@mockscope/a', 'a-1.0.0' ]
  const [packageName, packageNameAndVersion] = pathname.split(/\/-\/|\/download\//);
  // @mockscope/a -> a
  const packageNameWithoutScope = packageName.replace(/(\S*)\//, '')
  // a-1.0.0 -> 1.0.0
  const packageVersion = packageNameAndVersion.substr(packageNameWithoutScope.length + 1);
  return {
    name: packageName,
    version: packageVersion,
  };
}

function generatePackageId(name, version) {
  return `${name}@${version}`.replace('/', '_');
}

function generateBin({ binName, binPath, pkgPath, uid, gid }) {
  // .bin 一定在包名的同一级
  let binLink = path.join(path.dirname(pkgPath), '.bin');
  const pkgName = getPackageNameFromPackagePath(pkgPath);
  // 带 scope 的包需要找 2 级的 .bin
  if (pkgName.startsWith('@')) {
    binLink = path.join(path.dirname(path.dirname(pkgPath)), '.bin');
  }
  return {
    name: path.join(binLink, binName),
    type: 'symlink',
    size: 0,
    linkName: path.relative(binLink, binPath),
    mode: 0o755,
    uid,
    gid,
    uname: 'admin',
    gname: 'admin',
    offset: 0,
    devMajor: 0,
    devMinor: 0,
    NumLink: 0,
    digest: '',
  };
}

function generateSymbolLink(path, target, uid, gid, isDir) {
  return {
    name: path,
    type: 'symlink',
    size: 0,
    linkName: target,
    mode: isDir ? 0o777 : 0o666,
    uid,
    gid,
    uname: 'admin',
    gname: 'admin',
    offset: 0,
    devMajor: 0,
    devMinor: 0,
    NumLink: 0,
    digest: '',
  };
}

function rootDir(uid, gid) {
  return {
    name: '',
    type: 'dir',
    size: 0,
    mode: 0o755,
    uid,
    gid,
    uname: 'admin',
    gname: 'admin',
    offset: 0,
    devMajor: 0,
    devMinor: 0,
    NumLink: 0,
    digest: '',
  };
}

function getPackageNameFromPackagePath(packagePath) {
  if (!packagePath.includes('node_modules/')) {
    return packagePath;
  }
  const index = packagePath.lastIndexOf('node_modules/');
  return packagePath.substr(index + 'node_modules/'.length);
}

function getAliasPackageNameFromPackagePath(packagePath, packages) {
  if (!packagePath.includes('node_modules/')) {
    return packagePath;
  }

  const pkgInfo = packages[packagePath];
  return pkgInfo.name || getPackageNameFromPackagePath(packagePath);
}

function verifyNpmConstraint(constraints, value) {
  if (!constraints) return true;
  const positive = constraints.filter(t => !t.startsWith('!'));
  const negative = constraints.filter(t => t.startsWith('!')).map(t => t.substr(1));
  if (positive.length) {
    return positive.includes(value);
  }
  if (negative.length) {
    return !negative.includes(value);
  }
  return true;
}

function isFlattenPackage(pkgPath) {
  return pkgPath.lastIndexOf('node_modules') === 0;
}

function resolveBinMap(pkgJSON) {
  // "bin": './bin/a' -> "bin": {pkgName: './bin/a'}
  normalize(pkgJSON);
  const bin = pkgJSON.bin || {};
  const reverseBinMap = {};
  for (const [ binName, binPath ] of Object.entries(bin)) {
    const normalizedBinPath = path.normalize(binPath);
    if (!reverseBinMap[normalizedBinPath]) {
      /**
       * 使用数组，存在同一个 bin 文件，需要建多个 bin 指令
       * "bin": {
       *    "a": "test.js",
       *    "a-cli": "test.js"
       * }
       */
      reverseBinMap[path.normalize(binPath)] = [];
    }

    reverseBinMap[path.normalize(binPath)].push(binName);
  }
  return reverseBinMap;
}

function getFileEntryMode(pkgId, pkg, entry) {
  const relatedPath = entry.name.substr(pkgId.length + 1);
  const reverseBinMap = resolveBinMap(pkg);
  // 原始 bin 文件，非 reg 类型
  if (reverseBinMap[path.normalize(relatedPath)] || entry.type !== 'reg') {
    return 0o755;
  }

  return entry.mode || 0o644;
}

function getEnv(originEnv, args = []) {
  const env = { ...originEnv };
  env.npm_config_argv = JSON.stringify({
    remain: [],
    cooked: args,
    original: args,
  });

  const parsedArgs = { 'no-save': args.includes('--no-save') };
  Object.assign(parsedArgs, parser(args, {
    string: [
      'root',
      'registry',
      'prefix',
      'forbidden-licenses',
      'custom-china-mirror-url',
      // {"http://a.com":"http://b.com"}
      'tarball-url-mapping',
      'proxy',
      // --high-speed-store=filepath
      'high-speed-store',
      'dependencies-tree',
    ],
    boolean: [
      'version',
      'help',
      'production',
      'client',
      'global',
      'save',
      'save-dev',
      'save-optional',
      'save-client',
      'save-build',
      'save-isomorphic',
      // Saved dependencies will be configured with an exact version rather than using npm's default semver range operator.
      'save-exact',
      'china',
      'ignore-scripts',
      // install ignore optionalDependencies
      'optional',
      'detail',
      'trace',
      'engine-strict',
      'flatten',
      'registry-only',
      'cache-strict',
      'fix-bug-versions',
      'prune',
      // disable dedupe mode https://docs.npmjs.com/cli/dedupe, back to npm@2 mode
      // please don't use on frontend project
      'disable-dedupe',
      'save-dependencies-tree',
      'force-link-latest',
    ],
    default: {
      optional: true,
    },
    alias: {
      // npm install [-S|--save|-D|--save-dev|-O|--save-optional] [-E|--save-exact] [-d|--detail]
      S: 'save',
      D: 'save-dev',
      O: 'save-optional',
      E: 'save-exact',
      v: 'version',
      h: 'help',
      g: 'global',
      c: 'china',
      r: 'registry',
      d: 'detail',
    },
  }));
  // npm cli will auto set options to npm_xx env.
  for (const key in parsedArgs) {
    const value = parsedArgs[key];
    if (value && typeof value === 'string') {
      env['npm_config_' + key] = value;
    }
  }
  return env;
}

// subPath === '' 时，为根目录
async function getWorkdir(cwd, subPath = '') {
  const workdirHash = crypto.createHash('md5').update(cwd).digest('hex');
  const dirname = `${path.basename(cwd)}_${workdirHash}`;
  const workdir = path.join(baseRapidModeDir, dirname);
  const hash = crypto.createHash('md5').update(subPath).digest('hex');
  const prefix = `${(subPath || 'root').replace('/', '_')}_${hash}`;
  const bootstrap = path.join(workdir, prefix, nydusdBootstrapFile);

  return {
    projectDir: workdir,
    dirname: path.join(dirname, prefix),
    baseDir: path.join(workdir, prefix), // .tnpm/rapid-mode/xxx
    overlay: path.join(workdir, prefix, 'overlay'), // .tnpm/rapid-mode/xxx/overlay
    upper: path.join(workdir, prefix, 'overlay', 'upper'), // .tnpm/rapid-mode/xxx/overlay/upper
    workdir: path.join(workdir, prefix, 'overlay', 'workdir'), // .tnpm/rapid-mode/xxx/overlay/workdir
    mnt: path.join(nydusdMnt, dirname, prefix), // .tnpm/rapid-mode/mnt/xxx
    tarIndex: path.join(workdir, prefix, 'tar.index.json'), // .tnpm/rapid-mode/xxx/tar.index.json
    bootstrap, // .tnpm/rapid-mode/xxx/nydusd-bootstrap
    depsJSONPath: path.join(workdir, prefix, 'overlay', 'upper', '.package-lock.json'), // .tnpm/rapid-mode/xxx/overlay/upper/.package-lock.json，服务端生成依赖树文件，需要写到 upperdir
    nodeModulesDir: path.join(cwd, subPath, 'node_modules'),
  };
}

async function getAllPkgPaths(cwd, pkg) {
  const workspaces = await getWorkspaces(cwd, pkg);
  const allPkgs = Object.values(workspaces);
  // root pkg
  allPkgs.push('');
  return allPkgs;
}

async function getWorkspaces(cwd, pkg) {
  const workspaces = await mapWorkspaces({
    cwd,
    pkg,
  });

  const workspacesMap = {};

  for (const [ , wsPath ] of workspaces) {
    const pkgJSON = require(path.join(wsPath, 'package.json'));
    workspacesMap[pkgJSON.name] = path.relative(cwd, wsPath);
  }

  return workspacesMap;
}

exports.getWorkdir = getWorkdir;

exports.getDisplayName = getDisplayName;
exports.wrapSudo = wrapSudo;
exports.createNydusdConfigFile = createNydusdConfigFile;
exports.shouldFuseSupport = shouldFuseSupport;
exports.getPackagePath = getPackagePath;
exports.parseTarballUrl = parseTarballUrl;
exports.generatePackageId = generatePackageId;
exports.generateBin = generateBin;
exports.getPackageNameFromPackagePath = getPackageNameFromPackagePath;
exports.getAliasPackageNameFromPackagePath = getAliasPackageNameFromPackagePath;
exports.rootDir = rootDir;
exports.verifyNpmConstraint = verifyNpmConstraint;
exports.generateSymbolLink = generateSymbolLink;
exports.isFlattenPackage = isFlattenPackage;
exports.resolveBinMap = resolveBinMap;
exports.getFileEntryMode = getFileEntryMode;
exports.getEnv = getEnv;
exports.getWorkspaces = getWorkspaces;
exports.getAllPkgPaths = getAllPkgPaths;
