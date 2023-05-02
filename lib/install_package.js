const debug = require('node:util').debuglog('npminstall:install');
const path = require('node:path');
const os = require('node:os');
const chalk = require('chalk');
const semver = require('semver');
const pMap = require('p-map');
const download = require('./download');
const utils = require('./utils');
const npa = require('./npa');
const bin = require('./bin');
const link = require('./link');
const dependencies = require('./dependencies');
const resolve = require('./download/npm').resolve;
const {
  REGISTRY_TYPES,
} = require('./npa_types');
const { runLifecycleScripts } = require('./lifecycle_scripts');

module.exports = install;

async function install(parentDir, pkg, ancestors, options, context) {
  try {
    return await _install(parentDir, pkg, ancestors, options, context);
  } catch (err) {
    if (pkg.optional) {
      if (err.name === 'UnSupportedPlatformError') {
        // ignore log error
        debug('%s', err.message);
        return;
      }
      options.console.error(chalk.yellow(`[${pkg.name}@${pkg.version}] optional install error: ${err.stack}`));
    } else {
      throw err;
    }
  }
}

async function _install(parentDir, pkg, ancestors, options, context) {
  const rootPkgDependencies = options.production ? options.rootPkgDependencies.prodMap : options.rootPkgDependencies.allMap;
  const ancestorsWithRoot = [{ dependencies: rootPkgDependencies, name: 'root package.json' }].concat(ancestors);

  // default install latest version
  if (!pkg.version) {
    pkg.version = '*';
  }

  pkg = options.resolution(pkg, ancestors, context.nested);

  debug('[%s/%s] install %s@%s in %s',
    options.progresses.finishedInstallTasks,
    options.progresses.installTasks,
    pkg.name, pkg.version, parentDir);
  if (options.spinner) {
    options.spinner.text = `[${options.progresses.finishedInstallTasks}/${options.progresses.installTasks}] Installing ${pkg.name}@${pkg.version}${os.EOL}`;
  }
  let p = npa(pkg.name ? `${pkg.name}@${pkg.version}` : pkg.version, { where: options.root, nested: context.nested });
  const displayName = p.displayName = utils.getDisplayName(pkg, ancestors);

  if (options.registryOnly && REGISTRY_TYPES.includes(p.type)) {
    throw new Error(`Only allow install package from registry, but "${displayName}" is ${p.type}`);
  }

  if (options.flatten || forceFlatten(pkg)) {
    const res = await matchAncestorDependencies(p, ancestorsWithRoot, options, context);
    if (res) {
      // output anti semver info if not the same version
      // ignore `<name>@*`
      if (res.childResolved !== res.ancestorResolved && res.childSpec !== '*') {
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
      p = npa(`${res.name}@${res.ancestorSpec}`, { where: options.root, nested: context.nested });
      pkg = Object.assign({}, pkg, { version: res.ancestorSpec });
    }
  }

  const key = `install:${pkg.name}@${pkg.version}`;
  const c = options.cache[key]; // {package: packageInfo, dir: realDir}
  if (c) {
    const realPkg = c.package;
    const realPkgDir = c.dir;
    await linkModule(pkg, parentDir, realPkg, realPkgDir, options, displayName);
    return {
      exists: true,
      dir: realPkgDir,
    };
  }

  // cache if two ranges have the same max bound
  let rangeKey;
  if (p.type === 'range') {
    const max = utils.getMaxRange(semver.validRange(p.fetchSpec, true));
    if (max) {
      rangeKey = `install:${pkg.name}:range:${max}`;
      const c = options.cache[rangeKey];
      if (c) {
        const realPkg = c.package;
        if (utils.fastSemverSatisfies(realPkg.version, p.fetchSpec)) {
          // add to cache.dependenciesTree, keep resolve version data complete
          options.cache.dependenciesTree[p.raw] = realPkg;
          const realPkgDir = c.dir;
          await linkModule(pkg, parentDir, realPkg, realPkgDir, options, displayName);
          return {
            exists: true,
            dir: realPkgDir,
          };
        }
      }
    }
  }

  const info = await download(p, options);

  const realPkg = info.package;
  const realPkgDir = info.dir;

  if (!realPkgDir) {
    return;
  }

  // record version
  options.packageVersions[realPkg.name] = options.packageVersions[realPkg.name] || new Set();
  options.packageVersions[realPkg.name].add(realPkg.version);

  // update package name when installing using git
  if (p.type === 'git') {
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
    if (options.publicHoistPattern.test(realPkg.name)) {
      options.publicHoistLatestVersions.set(realPkg.name, realPkg.version);
    }
  }

  if (info.exists) {
    // make sure bins will be links to ${parentDir}/node_modules/.bin
    await linkModule(pkg, parentDir, realPkg, realPkgDir, options, displayName);
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

    // https://docs.npmjs.com/files/package.json#engines
    const nodeVersion = realPkg.engines && realPkg.engines.node;
    if (nodeVersion && !utils.fastSemverSatisfies(process.version, nodeVersion)) {
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

    // link bundleDependencies' bin
    // npminstall fsevents
    const bundledDependencies = await getBundleDependencies(realPkg, realPkgDir);
    await Promise.all(bundledDependencies.map(name => bundleBin(name, realPkgDir, options, displayName)));

    const deps = dependencies(realPkg, options, context.nested);
    const pkgs = deps.prod;
    const pkgMaps = deps.prodMap;

    const nodeModulesDir = path.join(realPkgDir, 'node_modules');

    const peerDependencies = realPkg.peerDependencies || {};
    const peerDependenciesMeta = realPkg.peerDependenciesMeta || {};
    const needLinkPeerDependencies = [];
    if (Object.keys(peerDependencies).length > 0) {
      const unmatched = {};
      const reverseAncestors = ancestorsWithRoot.slice().reverse();
      for (const name in peerDependencies) {
        const version = peerDependencies[name];
        const raw = `${name}@${version}`;
        context.nested.update([ raw ], p.raw);
        // don't need to check if peer dependency is in dependencies
        if (pkgMaps[name]) continue;

        // if we can get any matched version from ancestor
        // install it as dependency
        const childPkg = npa(raw, { where: options.root, nested: context.nested });
        // check in reverse
        const res = await matchAncestorDependencies(childPkg, reverseAncestors, options, context);
        if (res) {
          pkgs.push({ name, version: res.ancestorSpec });
          needLinkPeerDependencies.push({ name, version: res.ancestorSpec });
        } else if (peerDependenciesMeta[name]?.optional !== true) {
          unmatched[name] = version;
        }
      }
      realPkg.peerDependencies = unmatched;

      options.peerDependencies.push({
        package: realPkg,
        packageDir: realPkgDir,
        displayName,
        parentDir,
      });
    }

    // handle sub-dependencies
    if (pkgs.length > 0) {
      await utils.mkdirp(nodeModulesDir);
      const needPkgs = pkgs.filter(childPkg => !bundledDependencies.includes(childPkg.name));
      context.nested.update(needPkgs.map(pkg => `${pkg.name}@${pkg.version}`), `${realPkg.name}@${realPkg.version}`);

      const mapper = async childPkg => {
        await install(realPkgDir, childPkg, ancestors.concat({
          displayName: `${realPkg.name}@${realPkg.version}`,
          name: realPkg.name,
          dependencies: deps.prodMap,
        }), options, context);
      };
      // NOTE: any chance that the installation will speed up slightly if we use
      // a global queue?
      await pMap(needPkgs, mapper, 10);
    }
    if (needLinkPeerDependencies.length > 0) {
      for (const peer of needLinkPeerDependencies) {
        const key = `install:${peer.name}@${peer.version}`;
        const c = options.cache[key];
        if (c) {
          // scoped package
          const relativePath = pkg.name && pkg.name.startsWith('@') ?
            `../../${c.package.name}` : `../${c.package.name}`;
          const linkDir = path.join(realPkgDir, relativePath);
          const relative = await utils.forceSymlink(c.dir, linkDir);
          debug('%s link peer package(%s@%s) %s => %s, parentDir: %s',
            displayName, c.package.name, c.package.version, linkDir, relative, realPkgDir);
        }
      }
    }
    // FIXME: run postinstall before link may cause incompatible error. see
    // arborist/reify.js#steps._build, npm runs postinstall after unpacking.
  } catch (err) {
    // delete donefile when install error, make sure this package won't be skipped during next installation.
    try {
      await utils.unsetInstallDone(realPkgDir);
    } catch (e) {
      options.console.warn(chalk.yellow(`unsetInstallDone: ${realPkgDir} error: ${e}, ignore it`));
    }
    throw err;
  }

  // from here, a package is already downloaded and unpacked into
  // <root>/.store/<name>/node_modules/<name>. but there is no sub-dependencies
  // in the same node_modules, following logic will link the package itself into
  // parent's node_modules folder.
  await linkModule(pkg, parentDir, realPkg, realPkgDir, options, displayName);

  debug('[%s/%s] installed %s@%s at %s',
    options.progresses.finishedInstallTasks,
    options.progresses.installTasks,
    realPkg.name,
    realPkg.version,
    realPkgDir);

  if (!options.ignoreScripts) {
    await runLifecycleScripts(realPkg, realPkgDir, pkg, displayName, options);
  }

  return {
    exists: false,
    dir: realPkgDir,
  };
}

async function getBundleDependencies(pkg, parentDir) {
  const bundles = pkg.bundledDependencies || pkg.bundleDependencies || [];
  const existBundles = [];
  // ignore not exist bundle dependencies
  for (const name of bundles) {
    if (await utils.exists(path.join(parentDir, 'node_modules', name))) {
      existBundles.push(name);
    }
  }
  return existBundles;
}

async function bundleBin(name, parentDir, options, displayName) {
  const pkgDir = path.join(parentDir, 'node_modules', name);
  const pkgfile = path.join(pkgDir, 'package.json');
  const pkg = await utils.readJSON(pkgfile);
  await bin(parentDir, pkg, pkgDir, options, displayName);
}

async function matchAncestorDependencies(childPkg, ancestors, options, context) {
  // only need check npm types
  if (!REGISTRY_TYPES.includes(childPkg.type)) return;

  for (const ancestor of ancestors) {
    const ancestorVersion = ancestor.dependencies[childPkg.name];
    if (!ancestorVersion) continue;
    const ancestorPkg = npa(`${childPkg.name}@${ancestorVersion}`, { where: options.root, nested: context.nested });
    if (!REGISTRY_TYPES.includes(ancestorPkg.type)) continue;
    ancestorPkg.parent = ancestor.name;
    const satisfied = await satisfiesRange(childPkg, ancestorPkg, options);
    if (satisfied) {
      return satisfied;
    }
  }
}

async function satisfiesRange(childPkg, ancestorPkg, options) {
  let satisfies = false;
  let resolveAncestorPkg = {};
  let resolveChildPkg = {};

  if (childPkg.raw === ancestorPkg.raw) {
    satisfies = true;
  } else {
    resolveAncestorPkg = await resolve(ancestorPkg, options);
    if (utils.fastSemverSatisfies(resolveAncestorPkg.version, childPkg.fetchSpec)) {
      resolveChildPkg = await resolve(childPkg, options);
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

function forceFlatten(pkg) {
  // 1.x, 1.0.x
  if (utils.endsWithX(pkg.version)) return true;
  // typeScript definitions
  if (pkg.name.startsWith('@types/')) return true;
}

// link module and bin files
async function linkModule(pkg, parentDir, realPkg, realPkgDir, options, displayName) {
  // fix concurrent install same bin name error
  try {
    await bin(parentDir, realPkg, realPkgDir, options, displayName);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
    // retry
    await bin(parentDir, realPkg, realPkgDir, options, displayName);
  }
  await link(parentDir, realPkg, realPkgDir, pkg.alias, options);
}
