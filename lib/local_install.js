'use strict';

/**
 * impl npm install [pkg1, pkg2, ...]
 */

const debug = require('debug')('npminstall:local_install');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const ms = require('ms');
const parallel = require('co-parallel');
const semver = require('semver');
const bytes = require('bytes');
const Module = require('module');
const fs = require('mz/fs');
const moment = require('moment');
const util = require('util');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const prepublish = require('./prepublish');
const install = require('./install');
const dependencies = require('./dependencies');
const createResolution = require('./resolution');
const formatInstallOptions = require('./format_install_options');
const link = require('./link');
const bin = require('./bin');

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
 *  - {Boolean} [disableDedupe] - disable dedupe mode, will back to npm@2 node_modules tree
 */
module.exports = function* (options) {
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
    yield _install(options);
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

function* _install(options) {
  const rootPkgFile = path.join(options.root, 'package.json');
  const rootPkg = yield utils.readJSON(rootPkgFile);
  const displayName = `${rootPkg.name}@${rootPkg.version}`;
  let pkgs = options.pkgs;
  const rootPkgDependencies = dependencies(rootPkg, options);
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
    // try to fix no version package from rootPkgDependencies
    const allDeps = rootPkgDependencies.allMap;
    for (const childPkg of pkgs) {
      if (!childPkg.version && allDeps[childPkg.name]) {
        childPkg.version = allDeps[childPkg.name];
        debug('auto fill version: %j', childPkg);
      }
    }
  }

  if (options.installRoot) yield preinstall(rootPkg, options.root, displayName, options);

  const nodeModulesDir = path.join(options.targetDir, 'node_modules');
  yield utils.mkdirp(nodeModulesDir);
  const rootPkgsMap = new Map();
  const tasks = [];
  for (const childPkg of pkgs) {
    childPkg.name = childPkg.name || '';
    rootPkgsMap.set(childPkg.name, true);
    options.progresses.installTasks++;
    tasks.push(installOne(options.targetDir, childPkg, options));
  }

  yield parallel(tasks, 10);
  options.downloadFinished = Date.now();
  options.spinner && options.spinner.succeed(`Installed ${tasks.length} packages`);

  if (!options.disableDedupe) {
    // dedupe mode https://docs.npmjs.com/cli/dedupe
    // link every packages' latest version to target directory
    // won't override exists target directory
    yield linkAllLatestVersion(rootPkgsMap, options);
  } else {
    options.spinner && options.spinner.succeed('disable dedupe mode');
  }

  // run postinstall script if exist
  if (options.installRoot) yield postinstall(rootPkg, options.root, false, displayName, options);
  // run dependencies' postinstall scripts
  yield runPostInstallTasks(options);

  // local install trigger prepublish when no packages and non-production mode
  // see:
  // - https://docs.npmjs.com/misc/scripts
  // - https://github.com/npm/npm/issues/3059#issuecomment-32057292
  if (options.installRoot && !options.production) yield prepublish(rootPkg, options.root, options);

  // link peerDependencies if not match the version in target directory
  yield linkPeer(options);

  // print all pending messages
  printPendingMessages(options);

  // record and print recently update modules
  recordRecentlyUpdates(options);

  // record all installed packages' versions
  recordPackageVersions(options);

  // record dependencies tree resolved from npm
  recordDependenciesTree(options);

  // print install finished
  finishInstall(options);
}

function* installOne(parentDir, childPkg, options) {
  if (!(yield needInstall(parentDir, childPkg, options))) {
    options.progresses.finishedInstallTasks++;
    options.console.info(
      chalk.gray(`[${options.progresses.finishedInstallTasks}/${options.progresses.installTasks}]`),
      chalk.cyan('Packgage '),
      chalk.gray(childPkg.name + '@' + childPkg.version),
      chalk.cyan('is skipped because it already exists at:'),
      path.join(parentDir, 'node_modules', childPkg.name)
    );
    return;
  }

  const res = yield install(parentDir, childPkg, [], options);
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

function* needInstall(parentDir, childPkg, options) {
  // always install if not install from package.json
  if (!options.installRoot) return true;

  const pkg = yield utils.readJSON(path.join(parentDir, 'node_modules', childPkg.name, 'package.json'));
  try {
    if (pkg.name && pkg.version && childPkg.version) {
      if (semver.validRange(childPkg.version) && semver.satisfies(pkg.version, childPkg.version)) {
        return false;
      }
    }
  } catch (err) {
    // ignore, maybe pkg.version invalid
    debug('[%s@%s] version invalid: %s', pkg.name, pkg.version, err);
  }
  // clean up
  if (childPkg.name) {
    yield utils.rimraf(path.join(parentDir, 'node_modules', childPkg.name));
  }
  return true;
}

function* checkLinkPeerDependencies(params, options) {
  const parentDir = params.parentDir;
  const realPkg = params.realPkg;
  const realPkgDir = params.realPkgDir;

  let rootPkg = {};
  try {
    rootPkg = yield utils.readJSON(path.join(options.targetDir, 'node_modules', realPkg.name, 'package.json'));
    if (rootPkg.version === realPkg.version) return;
  } catch (_) {
    // ignore
  }
  options.console.warn(
    '%s %s in %s unmet with %s(%s)',
    chalk.yellow('peerDependencies link'),
    chalk.yellow(`${realPkg.name}@${realPkg.version}`),
    chalk.gray(parentDir),
    chalk.gray(path.join(options.targetDir, 'node_modules', realPkg.name)),
    chalk.yellow(rootPkg.version || '-')
  );
  yield bin(parentDir, realPkg, realPkgDir, options);
  yield link(parentDir, realPkg, realPkgDir);
}

function* validatePeerDependencies(params, options) {
  const pkg = params.package;
  const parentDir = params.parentDir;

  const peerDependencies = pkg.peerDependencies;
  const names = Object.keys(peerDependencies);
  const cacheKey = `nodemodule:path:${parentDir}`;
  let paths = options.cache[cacheKey];
  if (!paths) {
    paths = options.cache[cacheKey] = Module._nodeModulePaths(parentDir);
  }
  for (const name of names) {
    const expectVersion = peerDependencies[name];
    const realPkg = yield utils.getPkgFromPaths(name, paths);
    if (!realPkg) {
      options.console.warn(
        '%s %s requires a peer of %s but none was installed',
        chalk.red('peerDependencies WARNING'),
        chalk.gray(params.displayName),
        chalk.yellow(`${name}@${expectVersion}`)
      );
      continue;
    }
    if (!semver.satisfies(realPkg.version, expectVersion)) {
      options.console.warn(
        '%s %s requires a peer of %s but %s was installed',
        chalk.red('peerDependencies WARNING'),
        chalk.gray(params.displayName),
        chalk.yellow(`${name}@${expectVersion}`),
        chalk.yellow(`${name}@${realPkg.version}`)
      );
      continue;
    }
    debug('%s requires a peer of %s and %s was installed at %s',
      chalk.green(params.displayName),
      chalk.green(`${name}@${expectVersion}`),
      chalk.green(`${name}@${realPkg.version}`),
      realPkg.installPath);
  }
}

function* linkAllLatestVersion(rootPkgsMap, options) {
  const linkTasks = [];
  for (const item of options.latestVersions) {
    const name = item[0];
    const version = item[1];
    if (!rootPkgsMap.has(name)) {
      options.progresses.linkTasks++;
      // link latest package to `storeDir/node_modules`
      linkTasks.push(linkLatestVersion({
        name,
        version,
      }, options.storeDir, options));
    }
  }

  if (linkTasks.length > 0) {
    yield parallel(linkTasks, 20);
  }
  options.spinner && options.spinner.succeed(`Linked ${linkTasks.length} latest versions`);
}

function* linkLatestVersion(pkg, storeDir, options) {
  const linkDir = path.join(storeDir, pkg.name);
  if (yield fs.exists(linkDir)) {
    options.progresses.finishedLinkTasks++;
    return debug('[%s/%s] %s already exists',
      options.progresses.finishedLinkTasks,
      options.progresses.linkTasks,
      linkDir);
  }
  yield utils.mkdirp(path.dirname(linkDir));
  const realDir = utils.getPackageStorePath(storeDir, pkg);
  const relative = yield utils.forceSymlink(realDir, linkDir);
  options.progresses.finishedLinkTasks++;
  debug('[%s/%s] %s@%s link %s => %s',
    options.progresses.finishedLinkTasks,
    options.progresses.linkTasks,
    pkg.name, pkg.version, linkDir, relative);
}

function* runPostInstallTasks(options) {
  let count = 0;
  const total = options.postInstallTasks.length;
  if (total && options.ignoreScripts) {
    options.console.warn(chalk.yellow('ignore all post install scripts'));
    return;
  }

  if (total) {
    options.console.log(chalk.yellow(`execute post install ${total} scripts...`));
  }

  for (const task of options.postInstallTasks) {
    count++;
    const pkg = task.pkg;
    const root = task.root;
    const displayName = task.displayName;
    const installScript = pkg.scripts.install;
    const postinstallScript = pkg.scripts.postinstall;
    try {
      if (installScript) {
        options.console.warn(
          '%s %s run %j, root: %j',
          chalk.yellow(`[${count}/${total}] scripts.install`),
          chalk.gray(displayName),
          installScript,
          root
        );
        const start = Date.now();
        try {
          yield utils.runScript(root, installScript, options);
        } catch (err) {
          options.console.warn('[npminstall:runscript:error] %s scripts.install run %j error: %s',
            chalk.red(displayName), installScript, err);
          throw err;
        }
        options.console.warn(
          '%s %s finished in %s',
          chalk.yellow(`[${count}/${total}] scripts.install`),
          chalk.gray(displayName),
          ms(Date.now() - start)
        );
      }
      if (postinstallScript) {
        options.console.warn(
          '%s %s run %j, root: %j',
          chalk.yellow(`[${count}/${total}] scripts.postinstall`),
          chalk.gray(displayName),
          postinstallScript,
          root
        );
        const start = Date.now();
        try {
          yield utils.runScript(root, postinstallScript, options);
        } catch (err) {
          options.console.warn('[npminstall:runscript:error] %s scripts.postinstall run %j error: %s',
            chalk.red(displayName), postinstallScript, err);
          throw err;
        }
        options.console.warn(
          '%s %s finished in %s',
          chalk.yellow(`[${count}/${total}] scripts.postinstall`),
          chalk.gray(displayName),
          ms(Date.now() - start)
        );
      }
    } catch (err) {
      // If post install execute error, make sure this package won't be skipped during next installation.
      try {
        yield utils.unsetInstallDone(root);
      } catch (e) {
        options.console.warn(chalk.yellow(`unsetInstallDone: ${root} error: ${e}, ignore it`));
      }
      if (task.optional) {
        console.warn(chalk.red('%s optional error: %s'), displayName, err.stack);
        continue;
      }
      err.message = `post install error, please remove node_modules before retry!\n${err.message}`;
      throw err;
    }
  }
  options.spinner && options.spinner.succeed(`Run ${options.postInstallTasks.length} scripts`);
}

function printPendingMessages(options) {
  for (const item of options.pendingMessages) {
    if (options.console[item[0]] && options.console[item[0]] !== debug) {
      options.console[item[0]].apply(options.console, item.slice(1));
    }
  }
}

function* linkPeer(options) {
  // only when root dependencies unmet peer dependencies
  // link the matched one as a dependencies
  // ensure peer dependencies flatten by default
  if (options.linkPeerDependencies.length) {
    yield options.linkPeerDependencies.map(item => checkLinkPeerDependencies(item, options));
  }
  if (options.peerDependencies.length) {
    yield options.peerDependencies.map(item => validatePeerDependencies(item, options));
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
    const keys = Object.keys(displays).sort((a, b) => {
      return a > b ? -1 : 1;
    });

    recentlyUpdatesText += '\n';
    for (const key of keys) {
      const isToday = key === today;
      const label = isToday ? 'Today:' : key;
      const logToConsole = !options.onlyShowTodayUpdateToConsole || (options.onlyShowTodayUpdateToConsole && isToday);
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
    fs.writeFileSync(recentlyUpdatesTextFile, recentlyUpdatesText);
  }
}

function recordPackageVersions(options) {
  if (!options.installRoot) return;
  const versions = {};
  for (const pkg in options.packageVersions) {
    versions[pkg] = Array.from(options.packageVersions[pkg]);
  }
  const packageVersionsFile = path.join(options.storeDir, '.package_versions.json');
  fs.writeFileSync(packageVersionsFile, JSON.stringify(versions, null, 2));
}

function recordDependenciesTree(options) {
  if (!options.saveDependenciesTree) return;

  const tree = {};
  for (const key in options.cache.dependenciesTree) {
    tree[key] = omitPackage(options.cache.dependenciesTree[key]);
  }
  const installCacheFile = path.join(options.storeDir, '.dependencies_tree.json');
  fs.writeFileSync(installCacheFile, JSON.stringify(tree, null, 2));
}

function finishInstall(options) {
  const totalUse = Date.now() - options.start;
  const downloadUse = options.downloadFinished - options.start;
  const totalSize = options.totalTarballSize + options.totalJSONSize;
  const avgSpeed = totalSize / downloadUse * 1000;
  const logArguments = [
    chalk[options.detail ? 'green' : 'white']('All packages installed (%s%s%s%sused %s(network %s), speed %s/s, json %s(%s), tarball %s%s)'),
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
    options.prune ? `, ignore ${options.pruneCount}/${options.rawCount}(${bytes(options.pruneSize)}/${bytes(options.rawSize)}) files` : '',
  ];
  if (options.spinner) {
    options.spinner.succeed(util.format.apply(util, logArguments));
  } else {
    options.console.info.apply(console, logArguments);
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
