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
const resolve = require('./download/npm').resolve;

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

const REMOTE_TYPES = {
  local: true,
  remote: true,
  git: true,
  hosted: true,
};

function* _install(parentDir, pkg, ancestors, options) {
  const rootPkgDependencies = options.production ? options.rootPkgDependencies.prodMap : options.rootPkgDependencies.allMap;
  const ancestorsWithRoot = [{ dependencies: rootPkgDependencies, name: 'root package.json' }].concat(ancestors);

  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  pkg = options.resolution(pkg, ancestors);

  debug('[%s/%s] install %s@%s in %s',
    options.progresses.finishedInstallTasks,
    options.progresses.installTasks,
    pkg.name, pkg.version, parentDir);
  if (options.spinner) {
    options.spinner.text = `[${options.progresses.finishedInstallTasks}/${options.progresses.installTasks}] Installing ${pkg.name}@${pkg.version}`;
  }
  let p = npa(pkg.name ? `${pkg.name}@${pkg.version}` : pkg.version);
  const displayName = p.displayName = utils.getDisplayName(pkg, ancestors);

  if (options.registryOnly && REMOTE_TYPES[p.type]) {
    throw new Error(`Only allow install package from registry, but "${displayName}" is ${p.type}`);
  }

  if (options.flatten || forceFlatten(pkg)) {
    const res = yield matchAncestorDependencies(p, ancestorsWithRoot, options);
    if (res) {
      // output anti semver info if not the same version
      if (res.childResolved !== res.ancestorResolved) {
        options.pendingMessages.push([
          'warn',
          '%s %s delcares %s(resolved as %s) but using ancestor(%s)\'s dependency %s(resolved as %s)',
          chalk.magenta('anti semver'),
          chalk.gray(res.displayName),
          chalk.yellow(`${res.name}@${res.childSpec}`),
          chalk.yellow(res.childResolved),
          chalk.gray(res.ancestor),
          chalk.yellow(`${res.name}@${res.ancestorSpec}`),
          chalk.yellow(res.ancestorResolved),
        ]);
      }
      // use ancestor's spec
      p = npa(`${res.name}@${res.ancestorSpec}`);
      pkg = Object.assign({}, pkg, { version: res.ancestorSpec });
    }
  }

  const key = `install:${pkg.name}@${pkg.version}`;
  const c = options.cache[key]; // {package: packageInfo, dir: realDir}
  if (c) {
    const realPkg = c.package;
    const realPkgDir = c.dir;
    yield linkModule(pkg, parentDir, realPkg, realPkgDir, options);
    return {
      exists: true,
      dir: realPkgDir,
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
        const realPkg = c.package;
        if (semver.satisfies(realPkg.version, p.spec)) {
          // add to cache.dependenciesTree, keep resolve version data complete
          options.cache.dependenciesTree[p.raw] = realPkg;
          const realPkgDir = c.dir;
          yield linkModule(pkg, parentDir, realPkg, realPkgDir, options);
          return {
            exists: true,
            dir: realPkgDir,
          };
        }
      }
    }
  }

  const info = yield download(p, options);
  const realPkg = info.package;
  const realPkgDir = info.dir;

  // record version
  options.packageVersions[realPkg.name] = options.packageVersions[realPkg.name] || new Set();
  options.packageVersions[realPkg.name].add(realPkg.version);

  // update package name when installing using git
  if (p.type === 'hosted') {
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
    yield linkModule(pkg, parentDir, realPkg, realPkgDir, options);
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

  try {
    if (realPkg.publish_time && realPkg.publish_time >= options.recentlyUpdateMinDateTime) {
      options.recentlyUpdates.set(`${displayName}(${chalk.green(realPkg.version)})`, new Date(realPkg.publish_time));
    }

    if (realPkg.deprecated) {
      options.pendingMessages.push([
        'warn',
        '%s %s %s',
        chalk.red('deprecate'),
        chalk.gray(displayName),
        realPkg.deprecated,
      ]);
    }

    if (realPkg.license && options.forbiddenLicensesRegex && options.forbiddenLicensesRegex.test(realPkg.license)) {
      options.pendingMessages.push([
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

    // https://docs.npmjs.com/files/package.json#engines
    const nodeVersion = realPkg.engines && realPkg.engines.node;
    if (nodeVersion && !semver.satisfies(process.version, nodeVersion)) {
      const err = new Error(`"node@${process.version}" is incompatible with ${displayName}, expected node@${nodeVersion}`);
      err.name = 'UnSupportedNodeError';
      if (options.engineStrict) {
        throw err;
      } else {
        options.console.warn(
          '\n%s %s',
          chalk.magenta('WARN node unsupported'),
          err.message
        );
      }
    }

    yield preinstall(realPkg, realPkgDir, displayName, options);
    // link bundleDependencies' bin
    // npminstall fsevents
    const bundledDependencies = yield getBundleDependencies(realPkg, realPkgDir);
    yield bundledDependencies.map(name => bundleBin(name, realPkgDir, options));

    const deps = dependencies(realPkg, options);
    const pkgs = deps.prod;
    const pkgMaps = deps.prodMap;

    const nodeModulesDir = path.join(realPkgDir, 'node_modules');

    const peerDependencies = realPkg.peerDependencies || {};
    if (Object.keys(peerDependencies).length) {
      const unmatched = {};
      const reverseAncestors = ancestorsWithRoot.slice().reverse();
      for (const name in peerDependencies) {
        const version = peerDependencies[name];
        // don't need to check if peer dependency is in dependencies
        if (pkgMaps[name]) continue;

        // if we can get any matched version from ancestor
        // install it as dependency
        const childPkg = npa(`${name}@${version}`);
        // check in reverse
        const res = yield matchAncestorDependencies(childPkg, reverseAncestors, options);
        if (res) {
          pkgs.push({ name, version: res.ancestorSpec, peer: true });
        } else {
          unmatched[name] = version;
        }
      }
      realPkg.peerDependencies = unmatched;

      options.peerDependencies.push({
        package: realPkg,
        displayName,
        parentDir,
      });
    }

    if (pkgs.length > 0) {
      yield utils.mkdirp(nodeModulesDir);
      const tasks = [];
      for (const childPkg of pkgs) {
        if (bundledDependencies.indexOf(childPkg.name) !== -1) {
          continue;
        }

        tasks.push(install(realPkgDir, childPkg, ancestors.concat({
          displayName: `${realPkg.name}@${realPkg.version}`,
          name: realPkg.name,
          dependencies: deps.prodMap,
        }), options));
      }
      yield parallel(tasks, 10);
    }
    yield postinstall(realPkg, realPkgDir, pkg.optional, displayName, options);
  } catch (err) {
    // delete donefile when install error, make sure this package won't be skipped during next installation.
    try {
      yield utils.unsetInstallDone(realPkgDir);
    } catch (e) {
      options.console.warn(chalk.yellow(`unsetInstallDone: ${realPkgDir} error: ${e}, ignore it`));
    }
    throw err;
  }

  yield linkModule(pkg, parentDir, realPkg, realPkgDir, options);

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

function* matchAncestorDependencies(childPkg, ancestors, options) {
  // only need check npm types
  if (!fromNpm(childPkg.type)) return;

  for (const ancestor of ancestors) {
    const ancestorVersion = ancestor.dependencies[childPkg.name];
    if (!ancestorVersion) continue;
    const ancestorPkg = npa(`${childPkg.name}@${ancestorVersion}`);
    if (!fromNpm(ancestorPkg.type)) continue;
    ancestorPkg.parent = ancestor.name;
    const satisfied = yield satisfiesRange(childPkg, ancestorPkg, options);
    if (satisfied) return satisfied;
  }
}

function* satisfiesRange(childPkg, ancestorPkg, options) {
  let satisfies = false;
  let resolveAncestorPkg = {};
  let resolveChildPkg = {};

  if (childPkg.raw === ancestorPkg.raw) {
    satisfies = true;
  } else {
    resolveAncestorPkg = yield resolve(ancestorPkg, options);
    if (semver.satisfies(resolveAncestorPkg.version, childPkg.spec)) {
      resolveChildPkg = yield resolve(childPkg, options);
      satisfies = true;
    }
  }
  if (!satisfies) return;

  debug('%s delcares %s(resolved as %s) but using ancestor(%s)\'s dependency %s(resolved as %s)',
    childPkg.displayName,
    `${childPkg.name}@${childPkg.rawSpec}`,
    resolveChildPkg.version || '-',
    ancestorPkg.parent,
    `${childPkg.name}@${ancestorPkg.rawSpec}`,
    resolveAncestorPkg.version || '-'
  );

  return {
    name: childPkg.name,
    displayName: childPkg.displayName,
    childSpec: childPkg.rawSpec,
    childResolved: resolveChildPkg.version || '-',
    ancestor: ancestorPkg.parent,
    ancestorSpec: ancestorPkg.rawSpec,
    ancestorResolved: resolveAncestorPkg.version || '-',
  };
}

function fromNpm(type) {
  return [ 'remote', 'local', 'hosted', 'git' ].indexOf(type) === -1;
}

function forceFlatten(pkg) {
  // 1.x, 1.0.x
  if (utils.endsWithX(pkg.version)) return true;
  // typeScript definitions
  if (pkg.name.startsWith('@types/')) return true;
}

// link module and bin files
function* linkModule(pkg, parentDir, realPkg, realPkgDir, options) {
  if (!pkg.peer) {
    // fix concurrent install same bin name error
    try {
      yield bin(parentDir, realPkg, realPkgDir, options);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      // retry
      yield bin(parentDir, realPkg, realPkgDir, options);
    }
    yield link(parentDir, realPkg, realPkgDir);
  } else {
    // peer dependencies will link after check root
    options.linkPeerDependencies.push({ parentDir, realPkg, realPkgDir });
  }
}
