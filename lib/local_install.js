/**
 * impl npm install [pkg1, pkg2, ...]
 */

const debug = require('node:util').debuglog('npminstall:local_install');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { writeFileSync } = require('node:fs');
const util = require('node:util');
const chalk = require('chalk');
const ms = require('ms');
const pMap = require('p-map');
const semver = require('semver');
const bytes = require('bytes');
const moment = require('moment');
const utils = require('./utils');
const installPackage = require('./install_package');
const dependencies = require('./dependencies');
const createResolution = require('./resolution');
const formatInstallOptions = require('./format_install_options');
const Context = require('./context');
const { runLifecycleScripts } = require('./lifecycle_scripts');

/**
 * npm install
 * @param {Object} options - install options
 *  - {String} root - npm install root dir
 *  - {String} [registry] - npm registry url, default is `https://registry.npmjs.com`
 *  - {String} [targetDir] - node_modules target dir, default is ${root}.
 *  - {String} [storeDir] - npm modules store dir, default is `${targetDir}/node_modules`
 *  - {Number} [timeout] - npm registry request timeout, default is 60000 ms
 *  - {Number} [streamingTimeout] - download tar.gz stream timeout, default is 120000 ms
 *  - {Console} [console] - console logger instance, default is `console`
 *  - {Array<Object>} [pkgs] - optional packages to install, default is `[]`
 *  - {Boolean} [production] - production mode install, default is `false`
 *  - {Object} [env] - postinstall and preinstall scripts custom env.
 *  - {String} [cacheDir] - tarball cache store dir, default is `$HOME/.npminstall_tarball`.
 *  	if `production` mode enable, `cacheDir` will be disable.
 *  - {Object} [binaryMirrors] - binary mirror config, default is `{}`
 *  - {Boolean} [ignoreScripts] - ignore pre / post install scripts, default is `false`
 *  - {Array} [forbiddenLicenses] - forbit install packages which used these licenses
 *  - {Boolean} [trace] - show memory and cpu usages traces of installation
 *  - {Boolean} [flatten] - flatten dependencies by matching ancestors' dependencies
 *  - {Boolean} [disableFallbackStore] - disable fallback store, default is `false`
 *  - {Boolean} [offline] - offline mode, default is `false`
 * @param {Object} context - install context
 */
module.exports = async (options, context = new Context()) => {
  options = formatInstallOptions(options);
  options.spinner && options.spinner.start();
  let traceTimer;
  let showTrace;
  if (options.trace) {
    const startTime = Date.now();
    let cpuUsage = process.cpuUsage && process.cpuUsage();
    showTrace = () => {
      cpuUsage = process.cpuUsage && process.cpuUsage(cpuUsage);
      const memoryUsage = process.memoryUsage();
      const loads = os.loadavg().map(v => Math.round(v * 10) / 10 + '').join(', ');
      if (cpuUsage) {
        options.console.warn('[trace] %s 🏊  memory usage, rss: %s, heapTotal: %s, heapUsed: %s, external: %s; 💻  os free: %s, os load: %s; 🏃  cpu usage, user: %s, system: %s',
          ms(Date.now() - startTime),
          bytes(memoryUsage.rss),
          bytes(memoryUsage.heapTotal),
          bytes(memoryUsage.heapUsed),
          bytes(memoryUsage.external || 0),
          bytes(os.freemem()),
          loads,
          Math.floor(cpuUsage.user / 1000 / 1000),
          Math.floor(cpuUsage.system / 1000 / 1000));
      } else {
        options.console.warn('[trace] %s 🏊  memory usage, rss: %s, heapTotal: %s, heapUsed: %s, external: %s; 💻  os free: %s, os load: %s',
          ms(Date.now() - startTime),
          bytes(memoryUsage.rss),
          bytes(memoryUsage.heapTotal),
          bytes(memoryUsage.heapUsed),
          bytes(memoryUsage.external || 0),
          bytes(os.freemem()),
          loads);
      }
    };
    traceTimer = setInterval(showTrace, 1000);
  }

  try {
    await _install(options, context);
  } catch (err) {
    if (options.spinner) {
      options.spinner.fail(`Install fail! ${err}`);
    } else {
      options.console.error(`Install fail! ${err}`);
    }
    throw err;
  } finally {
    if (traceTimer) {
      clearInterval(traceTimer);
      showTrace();
    }
  }
};

async function _install(options, context) {
  const rootPkgFile = path.join(options.root, 'package.json');
  const rootPkg = await utils.readJSON(rootPkgFile);
  const displayName = `${rootPkg.name}@${rootPkg.version}`;
  let pkgs = options.pkgs;
  const rootPkgDependencies = dependencies(rootPkg, options, context.nested);
  options.rootPkgDependencies = rootPkgDependencies;
  options.resolution = createResolution(rootPkg, options);
  if (pkgs.length === 0) {
    if (options.client) {
      pkgs = rootPkgDependencies.client;
    } else if (options.production) {
      pkgs = rootPkgDependencies.prod;
    } else {
      pkgs = rootPkgDependencies.all;
    }
    debug(`about to locally install pkgs (production: ${options.production}, client: ${options.client}): ${JSON.stringify(pkgs, null, 2)}`);
  } else {
    debug('pkgs: %o', pkgs);
    // try to fix no version package from rootPkgDependencies
    const allDeps = rootPkgDependencies.allMap;
    for (const childPkg of pkgs) {
      if (!childPkg.version && allDeps[childPkg.name]) {
        childPkg.version = allDeps[childPkg.name];
        debug('auto fill version: %j', childPkg);
      }
    }
  }

  context.nested.update(pkgs.map(pkg => `${pkg.name}@${pkg.version}`), rootPkg.name && rootPkg.version ? displayName : 'root');
  const nodeModulesDir = path.join(options.targetDir, 'node_modules');
  await utils.mkdirp(nodeModulesDir);
  const rootPkgsMap = new Map();
  const mapper = async childPkg => {
    childPkg.name = childPkg.name || '';
    rootPkgsMap.set(childPkg.name, true);
    options.progresses.installTasks++;
    await _installOne(options.targetDir, childPkg, options, context);
  };

  // multi-thread installation
  await pMap(pkgs, mapper, 10);
  options.downloadFinished = Date.now();

  if (!options.disableFallbackStore) {
    // link every packages' latest version to <root>/node_modules/.store/node_modules, fallback for peerDeps
    await linkAllLatestVersionToFallbackDir(rootPkgsMap, options);
  }
  // https://pnpm.io/zh/next/npmrc#public-hoist-pattern
  await linkPublicHoistPackagesToRoot(rootPkgsMap, options);
  // workspace package should link deps to root/node_modules
  if (options.enableWorkspace && options.isWorkspacePackage) {
    for (const pkg of pkgs) {
      const key = `install:${pkg.name}@${pkg.version}`;
      const c = options.cache[key];
      if (c) {
        const linkDir = path.join(options.workspaceRoot, `node_modules/${c.package.name}`);
        const relative = await utils.forceSymlink(c.dir, linkDir);
        debug('%s link workspace package deps(%s@%s) %s => %s',
          displayName, c.package.name, c.package.version, linkDir, relative);
      }
    }
  }

  if (options.installRoot && !options.ignoreScripts) {
    await runLifecycleScripts(rootPkg, options.root, { optional: false }, displayName, options);
  }

  // link peerDependencies if not match the version in target directory
  await linkPeer(options);

  // print all pending messages
  printPendingMessages(options);

  // record and print recently update modules
  recordRecentlyUpdates(options);

  // record all installed packages' versions
  recordPackageVersions(options);

  // record dependencies tree resolved from npm
  recordDependenciesTree(options);

  if (!options.ignoreScripts && options.runscriptCount > 0) {
    const runscriptInfo = util.format('Run %s script(s) in %s.', options.runscriptCount, ms(options.runscriptTime));
    if (options.spinner) {
      options.spinner.succeed(runscriptInfo);
    } else {
      console.info(runscriptInfo);
    }
  }

  options.spinner?.succeed(`Installed ${pkgs.length} packages on ${options.root}`);
  // print install finished
  finishInstall(options);

  await utils.removeInstallDone(options.root);
}

async function _installOne(parentDir, childPkg, options, context) {
  if (!(await needInstall(parentDir, childPkg, options))) {
    options.progresses.finishedInstallTasks++;
    options.console.info(
      chalk.gray(`[${options.progresses.finishedInstallTasks}/${options.progresses.installTasks}]`),
      chalk.cyan('Package'),
      chalk.gray(childPkg.name + '@' + childPkg.version),
      chalk.cyan('is skipped because it already exists at:'),
      path.join(parentDir, 'node_modules', childPkg.name)
    );
    return;
  }

  const res = await installPackage(parentDir, childPkg, [], options, context);
  options.progresses.finishedInstallTasks++;
  if (res) {
    options.console.info(
      '[%s/%s] %s %s at %s',
      options.progresses.finishedInstallTasks,
      options.progresses.installTasks,
      chalk.gray(childPkg.name + '@' + childPkg.version),
      res.exists ? chalk.cyan('existed') : chalk.green('installed'),
      path.relative(parentDir, res.dir)
    );
  }
}

async function needInstall(parentDir, childPkg, options) {
  // ignore workspace package
  if (options.workspacesMap?.has(childPkg.name)) {
    debug('workspace package(%s) exists, skip install', childPkg.name);
    const { package } = options.workspacesMap.get(childPkg.name);
    childPkg.workspacePackage = package;
    return false;
  }
  // always install if not install from package.json
  if (!options.installRoot) return true;

  const pkg = await utils.readJSON(path.join(parentDir, 'node_modules', childPkg.name, 'package.json'));
  try {
    if (pkg.name && pkg.version && childPkg.version) {
      if (semver.validRange(childPkg.version, true) && utils.fastSemverSatisfies(pkg.version, childPkg.version)) {
        return false;
      }
    }
  } catch (err) {
    // ignore, maybe pkg.version invalid
    debug('[%s@%s] version invalid: %s', pkg.name, pkg.version, err);
  }
  // clean up
  if (childPkg.name) {
    await utils.rimraf(path.join(parentDir, 'node_modules', childPkg.name));
  }
  return true;
}

async function validatePeerDependencies(params, options) {
  const pkg = params.package;
  const packageDir = params.packageDir;

  const peerDependencies = pkg.peerDependencies;
  const names = Object.keys(peerDependencies);
  const cacheKey = `nodemodule:path:${packageDir}`;
  let paths = options.cache[cacheKey];
  if (!paths) {
    paths = options.cache[cacheKey] = Module._nodeModulePaths(packageDir);
  }
  for (const name of names) {
    const expectVersion = peerDependencies[name];
    const realPkg = await utils.getPkgFromPaths(name, paths);
    if (!realPkg) {
      options.console.warn(
        '%s %s requires a peer of %s but none was installed, packageDir: %s',
        chalk.red('peerDependencies WARNING'),
        chalk.gray(params.displayName),
        chalk.yellow(`${name}@${expectVersion}`),
        packageDir
      );
      continue;
    }
    if (!utils.fastSemverSatisfies(realPkg.version, expectVersion)) {
      options.console.warn(
        '%s %s requires a peer of %s but %s was installed at %s, packageDir: %s',
        chalk.red('peerDependencies WARNING'),
        chalk.gray(params.displayName),
        chalk.yellow(`${name}@${expectVersion}`),
        realPkg.installPath,
        chalk.yellow(`${name}@${realPkg.version}`),
        packageDir
      );
      continue;
    }
    debug('%s requires a peer of %s and %s was installed at %s, packageDir: %s',
      chalk.green(params.displayName),
      chalk.green(`${name}@${expectVersion}`),
      chalk.green(`${name}@${realPkg.version}`),
      realPkg.installPath,
      packageDir);
  }
}

async function linkAllLatestVersionToFallbackDir(rootPkgsMap, options) {
  if (options.latestVersions.size > 0) {
    const mapper = async ([ name, version ]) => {
      if (!rootPkgsMap.has(name)) {
        options.progresses.linkTasks++;
        // link latest package to `<root>/node_modules/.store/node_modules`
        await linkLatestVersion({
          name,
          version,
        }, options.storeDir, options, true);
      }
    };
    await pMap(options.latestVersions, mapper, 20);
    const fallbackStoreDir = path.join(options.storeDir, '.store/node_modules');
    options.spinner?.succeed(`Linked ${options.latestVersions.size} latest versions fallback to ${fallbackStoreDir}`);
  }
}

async function linkPublicHoistPackagesToRoot(rootPkgsMap, options) {
  if (options.publicHoistLatestVersions.size > 0) {
    const mapper = async ([ name, version ]) => {
      if (!rootPkgsMap.has(name)) {
        options.progresses.linkTasks++;
        // link public hoist package to `<root>/node_modules`
        await linkLatestVersion({
          name,
          version,
        }, options.storeDir, options);
      }
      if (options.enableWorkspace && options.isWorkspacePackage) {
        options.progresses.linkTasks++;
        // link public hoist package to `<workspaceRoot>/node_modules`
        const workspaceRootNodeModules = path.join(options.workspaceRoot, 'node_modules');
        await linkLatestVersion({
          name,
          version,
        }, workspaceRootNodeModules, options);
      }
    };
    await pMap(options.publicHoistLatestVersions, mapper, 20);
    options.spinner?.succeed(`Linked ${options.publicHoistLatestVersions.size} public hoist packages to ${options.storeDir}`);
  }
}

async function shouldOverrideLink(pkg, linkDir, options) {
  const { forceLinkLatest, rootPkgDependencies } = options;
  if (!forceLinkLatest) return false;

  let rootPkgs;
  if (options.client) {
    rootPkgs = rootPkgDependencies.client;
  } else if (options.production) {
    rootPkgs = rootPkgDependencies.prod;
  } else {
    rootPkgs = rootPkgDependencies.all;
  }

  // if root packages include this package, then do not link
  for (const rootPkg of rootPkgs) {
    if (pkg.name === rootPkg.name) {
      return false;
    }
  }

  const pkgJSONPath = path.join(linkDir, 'package.json');
  try {
    const pkgJSON = await utils.readJSON(pkgJSONPath);
    if (semver.gt(pkg.version, pkgJSON.version)) {
      // pkg is the newer version
      return true;
    }

    return false;
  } catch (e) {
    return true;
  }
}

async function linkLatestVersion(pkg, storeDir, options, isFallback = false) {
  // storeDir: <root>/node_modules
  const linkDir = isFallback ? path.join(storeDir, '.store/node_modules', pkg.name) : path.join(storeDir, pkg.name);
  if (await utils.exists(linkDir) && !(await shouldOverrideLink(pkg, linkDir, options))) {
    options.progresses.finishedLinkTasks++;
    return debug('[%s/%s] %s already exists',
      options.progresses.finishedLinkTasks,
      options.progresses.linkTasks,
      linkDir);
  }
  await utils.rimraf(linkDir); // make sure to delete linkDir
  await utils.mkdirp(path.dirname(linkDir));
  const realDir = utils.getPackageStorePath(storeDir, pkg, options);
  const relative = await utils.forceSymlink(realDir, linkDir);
  options.progresses.finishedLinkTasks++;
  debug('[%s/%s] %s@%s link %s => %s',
    options.progresses.finishedLinkTasks,
    options.progresses.linkTasks,
    pkg.name, pkg.version, linkDir, relative);
}

function printPendingMessages(options) {
  for (const item of options.pendingMessages) {
    if (options.console[item[0]] && options.console[item[0]] !== debug) {
      options.console[item[0]](...item.slice(1));
    }
  }
}

async function linkPeer(options) {
  if (options.peerDependencies.length > 0) {
    await Promise.all(options.peerDependencies.map(item => validatePeerDependencies(item, options)));
  }
}

function recordRecentlyUpdates(options) {
  if (options.recentlyUpdates.size > 0) {
    const since = moment(options.recentlyUpdateMinDateTime).format('YYYY-MM-DD');
    const recentlyUpdatesTextFile = path.join(options.storeDir, '.recently_updates.txt');
    let recentlyUpdatesText = `Recently updated (since ${since})`;
    console.info('%s: %s %s',
      chalk.gray(recentlyUpdatesText),
      `${chalk.green(options.recentlyUpdates.size)} packages`,
      chalk.gray(`(detail see file ${recentlyUpdatesTextFile})`));
    const displays = {};
    for (const item of options.recentlyUpdates) {
      const name = item[0];
      const publishDate = moment(item[1]);
      const key = publishDate.format('YYYY-MM-DD');
      const list = displays[key] || [];
      list.push(`${name} ${chalk.gray(publishDate.format('(HH:mm:ss)'))}`);
      displays[key] = list;
    }

    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().add(-1, 'days').format('YYYY-MM-DD');
    const keys = Object.keys(displays).sort((a, b) => {
      return a > b ? -1 : 1;
    });

    recentlyUpdatesText += '\n';
    for (const key of keys) {
      const isToday = key === today;
      const isYesterday = key === yesterday;
      const label = isToday ? 'Today:' : key;
      // today or yesterday
      const logToConsole = !options.onlyShowTodayUpdateToConsole ||
        (options.onlyShowTodayUpdateToConsole && (isToday || isYesterday));
      const text = `  ${label}`;
      recentlyUpdatesText += `${text}\n`;

      logToConsole && console.info(chalk.gray(text));
      const list = displays[key];
      for (const message of list) {
        const text = `    ${chalk.green('→')} ${message}`;
        recentlyUpdatesText += `${text}\n`;

        logToConsole && console.info(text);
      }
    }
    writeFileSync(recentlyUpdatesTextFile, recentlyUpdatesText);
  }
}

function recordPackageVersions(options) {
  if (!options.installRoot) return;
  const versions = {};
  for (const pkg in options.packageVersions) {
    versions[pkg] = Array.from(options.packageVersions[pkg]);
  }
  const packageVersionsFile = path.join(options.storeDir, '.package_versions.json');
  writeFileSync(packageVersionsFile, JSON.stringify(versions, null, 2));
}

function recordDependenciesTree(options) {
  if (!options.saveDependenciesTree) return;

  const tree = {};
  for (const key in options.cache.dependenciesTree) {
    tree[key] = omitPackage(options.cache.dependenciesTree[key]);
  }
  const installCacheFile = path.join(options.storeDir, '.dependencies_tree.json');
  writeFileSync(installCacheFile, JSON.stringify(tree, null, 2));
}

function finishInstall(options) {
  const totalUse = Date.now() - options.start;
  const downloadUse = options.downloadFinished - options.start;
  const totalSize = options.totalTarballSize + options.totalJSONSize;
  const avgSpeed = totalSize / downloadUse * 1000;
  const logArguments = [
    chalk[options.detail ? 'green' : 'white']('All packages installed (%s%s%s%sused %s(network %s), speed %s/s, json %s(%s), tarball %s, manifests cache hit %s, etag hit %s / miss %s%s)'),
    options.registryPackages ? `${options.registryPackages} packages installed from npm registry, ` : '',
    options.remotePackages ? `${options.remotePackages} packages installed from remote url, ` : '',
    options.localPackages ? `${options.localPackages} packages installed from local file, ` : '',
    options.gitPackages ? `${options.gitPackages} packages installed from git, ` : '',
    ms(totalUse),
    ms(downloadUse),
    bytes(avgSpeed),
    options.totalJSONCount,
    bytes(options.totalJSONSize),
    bytes(options.totalTarballSize),
    options.totalCacheJSONCount,
    options.totalEtagHitCount,
    options.totalEtagMissCount,
    options.prune ? `, ignore ${options.pruneCount}/${options.rawCount}(${bytes(options.pruneSize)}/${bytes(options.rawSize)}) files` : '',
  ];
  if (options.spinner) {
    options.spinner.succeed(util.format(...logArguments));
  } else {
    options.console.info(...logArguments);
  }
}

function omitPackage(pkg) {
  const keys = [
    'name',
    'version',
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'clientDependencies',
    'buildDependencies',
    'isomorphicDependencies',
    'peerDependencies',
    'publish_time',
    'deprecate',
    'license',
    'os',
    'engines',
    'dist',
    'scripts',
    '_id',
    '__fixDependencies',
  ];
  const res = {};
  for (const key of keys) {
    if (pkg[key]) res[key] = pkg[key];
  }
  return res;
}
