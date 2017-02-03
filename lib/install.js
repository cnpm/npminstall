'use strict';

const debug = require('debug')('npminstall:install');
const path = require('path');
const fs = require('mz/fs');
const npa = require('npm-package-arg');
const chalk = require('chalk');
const semver = require('semver');
const parallel = require('co-parallel');
const download = require('./download');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const bin = require('./bin');
const link = require('./link');
const dependencies = require('./dependencies');

module.exports = install;

function* install(parentDir, pkg, ancestors, options) {
  try {
    return yield _install(parentDir, pkg, ancestors, options);
  } catch (err) {
    if (pkg.optional) {
      let message = err.stack;
      if (err.name === 'UnSupportedPlatformError') {
        message = err.message;
      }
      options.console.error(chalk.yellow(`[${pkg.name}@${pkg.version}] optional install error: ${message}`));
    } else {
      throw err;
    }
  }
}

function* _install(parentDir, pkg, ancestors, options) {
  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  if (pkg.version === '*') {
    // try to get max satisfy version from options.rootPkgDependencies
    const map = options.production ? options.rootPkgDependencies.prodMap : options.rootPkgDependencies.allMap;
    if (map[pkg.name]) {
      pkg.version = map[pkg.name];
      debug('use root dependencies version(%s@%s) instead of *', pkg.name, pkg.version);
    }
  }

  debug('[%s/%s] install %s@%s in %s',
    options.progresses.finishedInstallTasks,
    options.progresses.installTasks,
    pkg.name, pkg.version, parentDir);
  if (options.spinner) {
    options.spinner.text = `[${options.progresses.finishedInstallTasks}/${options.progresses.installTasks}] Installing ${pkg.name}@${pkg.version}`;
  }
  const p = npa(pkg.name ? `${pkg.name}@${pkg.version}` : pkg.version);

  const key = `install:${pkg.name}@${pkg.version}`;
  const c = options.cache[key]; // {package: packageInfo, dir: realDir}
  if (c) {
    const pkg = c.package;
    const dir = c.dir;
    yield bin(parentDir, pkg, dir, options);
    yield link(parentDir, pkg, dir);
    return {
      exists: true,
      dir,
    };
  }

  // cache if tow ranges have the same max bound
  let rangeKey;
  if (p.type === 'range') {
    const max = utils.getMaxRange(p.spec);
    if (max) {
      rangeKey = `install:${pkg.name}:range:${max}`;
      const c = options.cache[rangeKey];
      if (c) {
        const pkg = c.package;
        if (semver.satisfies(pkg.version, p.spec)) {
          const dir = c.dir;
          yield bin(parentDir, pkg, dir, options);
          yield link(parentDir, pkg, dir);
          return {
            exists: true,
            dir,
          };
        }
      }
    }
  }

  p.displayName = getDisplayName(pkg, ancestors);
  const info = yield download(p, options);
  const realPkg = info.package;
  const realPkgDir = info.dir;
  const donefile = path.join(realPkgDir, '.npminstall.done');

  // update package name when installing using git
  if (pkg.type === 'hosted') {
    pkg.name = realPkg.name;
  }

  options.cache[key] = {
    package: realPkg,
    dir: realPkgDir,
  };

  if (rangeKey) {
    options.cache[rangeKey] = {
      package: realPkg,
      dir: realPkgDir,
    };
  }

  const existingVersion = options.latestVersions.get(realPkg.name);
  if (!existingVersion || semver.gt(realPkg.version, existingVersion)) {
    options.latestVersions.set(realPkg.name, realPkg.version);
  }

  if (info.exists) {
    // make sure bins will be links to ${parentDir}/node_modules/.bin
    yield bin(parentDir, realPkg, realPkgDir, options);
    yield link(parentDir, realPkg, realPkgDir);
    return {
      exists: true,
      dir: realPkgDir,
    };
  }

  // install steps:
  // 1. pre install script
  // 2. install dependencies (don't install bundledDependencies, but need link)
  // 3. post install script
  // 4. link bin files
  // 5. link package to node_modules dir

  let grandfatherPkg;
  const displayName = getDisplayName(realPkg, ancestors);
  try {
    if (realPkg.publish_time && realPkg.publish_time >= options.recentlyUpdateMinDateTime) {
      options.recentlyUpdates.set(`${displayName}`, new Date(realPkg.publish_time));
    }

    if (realPkg.deprecated) {
      options.paddingMessages.push([
        'warn',
        '%s %s %s',
        chalk.magenta('deprecate'),
        chalk.gray(displayName),
        realPkg.deprecated,
      ]);
    }

    if (realPkg.license && options.forbiddenLicensesRegex && options.forbiddenLicensesRegex.test(realPkg.license)) {
      options.paddingMessages.push([
        'warn',
        '%s %s %s',
        chalk.magenta('license forbidden'),
        chalk.gray(displayName),
        `package ${realPkg.name}'s license(${realPkg.license}) is not allowed`,
      ]);
    }

    // https://docs.npmjs.com/files/package.json#os
    if (!utils.matchPlatform(process.platform, realPkg.os)) {
      const err = new Error('Package require os(' + realPkg.os.join(', ') +
        ') not compatible with your platform(' + process.platform + ')');
      err.name = 'UnSupportedPlatformError';
      options.console.error(
        '%s %s %s',
        chalk.magenta('platform unsupported'),
        chalk.gray(displayName),
        err.message
      );
      throw err;
    }

    yield preinstall(realPkg, realPkgDir, displayName, options);
    // link bundleDependencies' bin
    // npminstall fsevents
    const bundledDependencies = yield getBundleDependencies(realPkg, realPkgDir);
    yield bundledDependencies.map(name => bundleBin(name, realPkgDir, options));

    const pkgs = dependencies(realPkg).prod;
    if (pkgs.length > 0) {
      const nodeModulesDir = path.join(realPkgDir, 'node_modules');
      yield utils.mkdirp(nodeModulesDir);
      const tasks = [];
      for (const childPkg of pkgs) {
        if (bundledDependencies.indexOf(childPkg.name) !== -1) {
          continue;
        }
        // if version format "n.x", check grandfather's dependencies
        if (/^\d+\.x$/.test(childPkg.version)) {
          if (!grandfatherPkg) {
            grandfatherPkg = yield utils.readJSON(path.join(parentDir, 'package.json'));
          }
          const version = grandfatherPkg.dependencies && grandfatherPkg.dependencies[childPkg.name];
          if (version && /^[~^]\d+\.\d+\.\d+$/.test(version)) {
            if (semver.satisfies(version.substring(1), childPkg.version)) {
              options.console.info(
                '%s %s use %s\'s dependencies version: %j instead of %j',
                chalk.yellow('anti semver'),
                chalk.gray(getDisplayName(childPkg, ancestors.concat(realPkg.name))),
                grandfatherPkg.name,
                version,
                childPkg.version
              );
              childPkg.version = version;
            }
          }
        }
        tasks.push(install(realPkgDir, childPkg, ancestors.concat(`${realPkg.name}@${realPkg.version}`), options));
      }
      yield parallel(tasks, 10);
    }
    yield postinstall(realPkg, realPkgDir, pkg.optional, displayName, options);
  } catch (err) {
    // delete donefile when install error, make sure this package won't be skipped during next installation.
    try {
      yield utils.rimraf(donefile);
    } catch (e) {
      options.console.warn(chalk.yellow(`rmdir donefile: ${donefile} error: ${e}, ignore it`));
    }
    throw err;
  }

  yield bin(parentDir, realPkg, realPkgDir, options);
  yield link(parentDir, realPkg, realPkgDir);

  const peerDependencies = realPkg.peerDependencies || {};
  const names = Object.keys(peerDependencies);
  if (names.length > 0) {
    options.peerDependencies.push({
      package: realPkg,
      displayName,
      parentDir,
    });
  }
  debug('[%s/%s] installed %s@%s at %s',
    options.progresses.finishedInstallTasks,
    options.progresses.installTasks,
    realPkg.name,
    realPkg.version,
    realPkgDir);

  return {
    exists: false,
    dir: realPkgDir,
  };
}

function* getBundleDependencies(pkg, parentDir) {
  const bundles = pkg.bundledDependencies || pkg.bundleDependencies || [];
  const existBundles = [];
  // ignore not exist bundle dependencies
  for (const name of bundles) {
    if (yield fs.exists(path.join(parentDir, 'node_modules', name))) {
      existBundles.push(name);
    }
  }
  return existBundles;
}

function* bundleBin(name, parentDir, options) {
  const pkgDir = path.join(parentDir, 'node_modules', name);
  const pkgfile = path.join(pkgDir, 'package.json');
  const pkg = yield utils.readJSON(pkgfile);
  yield bin(parentDir, pkg, pkgDir, options);
}

function getDisplayName(pkg, ancestors) {
  return ancestors.concat([ `${pkg.name}@${pkg.version}` ]).join(chalk.gray(' › '));
}
