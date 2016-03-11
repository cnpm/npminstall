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

const debug = require('debug')('npminstall:install');
const path = require('path');
const npa = require('npm-package-arg');
const chalk = require('chalk');
const semver = require('semver');
const download = require('./download');
const utils = require('./utils');
const postinstall = require('./postinstall');
const preinstall = require('./preinstall');
const bin = require('./bin');
const link = require('./link');
const dependencies = require('./dependencies');

module.exports = install;

function* install(parentDir, pkg, options) {
  try {
    return yield _install(parentDir, pkg, options);
  } catch (err) {
    if (pkg.optional) {
      options.console.error(chalk.red(`[${pkg.name}@${pkg.version}] optional install error:`));
      options.console.error(err.stack);
    } else {
      throw err;
    }
  }
}

function* _install(parentDir, pkg, options) {
  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  debug('install %s@%s in %s', pkg.name, pkg.version, parentDir);
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
      dir: dir,
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
            dir: dir,
          };
        }
      }
    }
  }

  const info = yield download(p, options);
  const realPkg = info.package;
  const realPkgDir = info.dir;
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

  const existsVersion = options.latestVersions.get(realPkg.name);
  if (!existsVersion || semver.gt(realPkg.version, existsVersion)) {
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

  if (realPkg.deprecated) {
    options.console.warn('[%s] %s: %s',
      chalk.red(`${realPkg.name}@${realPkg.version}`), chalk.magenta('deprecate'), realPkg.deprecated);
  }

  // install steps:
  // 1. pre install script
  // 2. install dependencies (don't install bundledDependencies, but need link)
  // 3. post install script
  // 4. link bin files
  // 5. link package to node_modules dir

  let grandfatherPkg;
  try {
    yield preinstall(realPkg, realPkgDir, options);
    // link bundleDependencies' bin
    // npminstall fsevents
    const bundledDependencies = realPkg.bundledDependencies || realPkg.bundleDependencies || [];
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
          if (version && /^[~\^]\d+\.\d+\.\d+$/.test(version)) {
            if (semver.satisfies(version.substring(1), childPkg.version)) {
              options.console.info('[%s] use grandfather(%s@%s)\'s dependencies version: %j instead of %j, parent: %s@%s',
                chalk.yellow(`${childPkg.name}@${childPkg.version}`),
                grandfatherPkg.name,
                grandfatherPkg.version,
                version,
                childPkg.version,
                realPkg.name,
                realPkg.version);
              childPkg.version = version;
            }
          }
        }
        tasks.push(install(realPkgDir, childPkg, options));
      }
      yield tasks;
    }
    yield postinstall(realPkg, realPkgDir, pkg.optional, options);
  } catch (err) {
    // delete donefile when install error, make sure next time install won't success.
    yield utils.rimraf(realPkgDir);
    options.console.error(chalk.red('[%s@%s] install error: %s, parentDir: %s, remove %s\nerror stack: %s'),
      realPkg.name, realPkg.version, err, parentDir, realPkgDir, err.stack);
    throw err;
  }
  yield bin(parentDir, realPkg, realPkgDir, options);
  yield link(parentDir, realPkg, realPkgDir);

  const peerDependencies = realPkg.peerDependencies || {};
  const names = Object.keys(peerDependencies);
  if (names.length > 0) {
    options.peerDependencies.push({
      package: realPkg,
      parentDir: parentDir,
      packageDir: realPkgDir,
    });
  }
  debug('[%s@%s] installed', realPkg.name, realPkg.version);

  return {
    exists: false,
    dir: realPkgDir,
  };
}

function* bundleBin(name, parentDir, options) {
  const pkgDir = path.join(parentDir, 'node_modules', name);
  const pkgfile = path.join(pkgDir, 'package.json');
  const pkg = yield utils.readJSON(pkgfile);
  yield bin(parentDir, pkg, pkgDir, options);
}
