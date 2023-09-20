#!/usr/bin/env node

const debug = require('node:util').debuglog('npminstall:bin:install');
const path = require('node:path');
const util = require('node:util');
const { execSync } = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs/promises');
const { writeFileSync } = require('node:fs');
const chalk = require('chalk');
const parseArgs = require('minimist');
const { installLocal, installGlobal } = require('..');
const npa = require('../lib/npa');
const utils = require('../lib/utils');
const globalConfig = require('../lib/config');
const { parsePackageName } = require('../lib/alias');
const {
  LOCAL_TYPES,
  REMOTE_TYPES,
  ALIAS_TYPES,
} = require('../lib/npa_types');
const Context = require('../lib/context');
const { lockfileConverter } = require('../lib/lockfile_resolver');

const originalArgv = process.argv.slice(2);

// since minimist consider --no-xx is xx:false, we handle it manually here
const argv = { 'no-save': originalArgv.includes('--no-save') };
Object.assign(argv, parseArgs(originalArgv, {
  string: [
    'root',
    'registry',
    'prefix',
    'forbidden-licenses',
    'custom-china-mirror-url',
    // {"http://a.com":"http://b.com"}
    'tarball-url-mapping',
    'proxy',
    'dependencies-tree',
    // npminstall foo --workspace=aa
    // npminstall foo -w aa
    'workspace',
    /**
     * set package-lock.json path
     *
     * 1. only support package lock v2 and v3.
     * 2. npminstall doesn't inspect <cwd>/package-lock.json by default.
     * 3. because arborist doesn't support client/build/isomorphic dependencies,
     *    these kinds of dependencies will all be ignored.
     * 4. this option doesn't do extra check for the equivalence of package-lock.json and package.json
     *    simply behaves like `npm ci` but doesn't remove the node_modules in advance.
     * 5. you're not supposed to install extra dependencies along with a lockfile.
     */
    'lockfile-path',
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
    // run scripts on foreground, default is background
    'foreground-scripts',
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
    // don't link latest version to <root>/node_modules/.store/node_modules
    'disable-fallback-store',
    'save-dependencies-tree',
    'force-link-latest',
    'workspaces',
    'offline',
  ],
  default: {
    optional: true,
  },
  alias: {
    // npm install [-S|--save|-D|--save-dev|-O|--save-optional] [-E|--save-exact] [-d|--detail] [-w|--workspace]
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
    w: 'workspace',
  },
})
);

if (argv.version) {
  console.log(`npminstall v${require('../package.json').version}`);
  process.exit(0);
}

if (argv.help) {
  console.log(`
Usage:

  npminstall
  npminstall <pkg>
  npminstall <pkg> --workspace=<workspace>
  npminstall <pkg> -w <workspace>
  npminstall <pkg> --workspaces
  npminstall <pkg>@<tag>
  npminstall <pkg>@<version>
  npminstall <pkg>@<version range>
  npminstall <folder>
  npminstall <tarball file>
  npminstall <tarball url>
  npminstall <git:// url>
  npminstall <github username>/<github project>
  npminstall --proxy=http://localhost:8080
  npminstall --lockfile-path=</path/to/package-lock.json>

Can specify one or more: npminstall ./foo.tgz bar@stable /some/folder
If no argument is supplied, installs dependencies from ./package.json.

Options:

  --production: won't install devDependencies
  --client: install clientDependencies and buildDependencies
  --save, --save-dev, --save-optional, --save-exact, --save-client, --save-build, --save-isomorphic: save installed dependencies into package.json
  --no-save: Prevents saving to dependencies
  -g, --global: install devDependencies to global directory which specified in '$npm config get prefix'
  -r, --registry: specify custom registry
  -c, --china: specify in china, will automatically using chinese npm registry and other binary's mirrors
  -d, --detail: show detail log of installation
  -w, --workspace: install on one workspace only, e.g.: npminstall koa -w a
  --workspaces: install new package on all workspaces, e.g: npminstall foo --workspaces
  --trace: show memory and cpu usages traces of installation
  --ignore-scripts: ignore all preinstall / install and postinstall scripts during the installation
  --foreground-scripts: scripts run in the background by default, to see the output, run with: --foreground-scripts
  --no-optional: ignore all optionalDependencies during the installation
  --forbidden-licenses: forbidden install packages which used these licenses
  --engine-strict: refuse to install (or even consider installing) any package that claims to not be compatible with the current Node.js version.
  --flatten: flatten dependencies by matching ancestors' dependencies
  --registry-only: make sure all packages install from registry. Any package is installed from remote(e.g.: git, remote url) cause install fail.
  --cache-strict: use disk cache even on production env.
  --fix-bug-versions: automatically fix bug version of packages.
  --prune: prune unnecessary files from ./node_modules, such as markdown, typescript source files, and so on.
  --dependencies-tree: install with dependencies tree to restore the last install.
  --force-link-latest: force link latest version package to module root path.
  --offline: offline mode. If a package won't be found locally, the installation will fail.
`
  );
  process.exit(0);
}

const pkgs = [];

if (process.env.NPMINSTALL_BY_UPDATE) {
  // ignore all package names on update
  argv._ = [];
}

const context = new Context();
for (const name of argv._) {
  context.nested.update([ name ]);
  const [
    aliasPackageName,
  ] = parsePackageName(name, context.nested);
  const p = npa(name, { where: argv.root, nested: context.nested });
  pkgs.push({
    name: p.name,
    // `mozilla/nunjucks#0f8b21b8df7e8e852b2e1889388653b7075f0d09` should be rawSpec
    version: p.fetchSpec || p.rawSpec,
    type: p.type,
    alias: aliasPackageName,
    arg: p,
  });
}

let root = argv.root || process.cwd();
if (Array.isArray(root)) {
  // use last one, e.g.: $ npminstall --root=abc --root=def
  root = root[root.length - 1];
}
let installOnAllWorkspaces = argv.workspaces;
let installWorkspaceNames = utils.formatWorkspaceNames(argv);
const production = argv.production || process.env.NODE_ENV === 'production';
const cacheStrict = argv['cache-strict'];
// support npm_config_cache to change default cache dir
const defaultCacheDir = process.env.npm_config_cache || path.join(os.homedir(), '.npminstall_tarball');
let cacheDir = defaultCacheDir;
if (!cacheStrict && (production || argv.cache === false)) {
  cacheDir = '';
}

let forbiddenLicenses = argv['forbidden-licenses'];
forbiddenLicenses = forbiddenLicenses ? forbiddenLicenses.split(',') : null;

const flatten = argv.flatten;
const prune = argv.prune;

// if in china, will automatic using chinese registry and mirror.
const inChina = argv.china || !!process.env.npm_china;
// if exists, override default china mirror url
const customChinaMirrorUrl = argv['custom-china-mirror-url'];

// example: npminstall --registry xx --registry xxxx
let registry = (Array.isArray(argv.registry) ? argv.registry[0] : argv.registry) || process.env.npm_registry;
if (inChina) {
  registry = registry || globalConfig.chineseRegistry;
}
// for env.npm_config_registry
registry = registry || 'https://registry.npmjs.com';

const proxy = argv.proxy || process.env.npm_proxy || process.env.npm_config_proxy;
const offline = !!argv.offline;

const env = {
  npm_config_registry: registry,
  // set npm_config_argv
  // see https://github.com/cnpm/npminstall/issues/121#issuecomment-247836741
  npm_config_argv: JSON.stringify({
    remain: [],
    cooked: originalArgv,
    original: originalArgv,
  }),
  // user-agent
  npm_config_user_agent: globalConfig.userAgent,
  // https://github.com/sass/node-sass/blob/master/lib/extensions.js#L270
  // make sure npm_config_cache env exists
  npm_config_cache: defaultCacheDir,
};
// https://github.com/npm/npm/blob/2005f4ce11f6cdf142f8a77f4f7ee4996000fb57/lib/utils/lifecycle.js#L67
env.npm_node_execpath = env.NODE = process.env.NODE || process.execPath;
env.npm_execpath = require.main.filename;

// npm cli will auto set options to npm_xx env.
for (const key in argv) {
  const value = argv[key];
  if (value && typeof value === 'string') {
    env['npm_config_' + key] = value;
  }
}

debug('argv: %j, env: %j', argv, env);

(async () => {
  const { workspaceRoots, workspacesMap } = await utils.readWorkspaces(root);
  if (workspacesMap.size > 0) {
    for (const info of workspacesMap.values()) {
      // link to root/node_modules
      const linkDir = path.join(root, 'node_modules', info.package.name);
      await utils.forceSymlink(info.root, linkDir);
      debug('add workspace %s on %s', info.package.name, info.root);
    }
  }
  // don't enable workspace on global install
  const enableWorkspace = !argv.global && workspacesMap.size > 0;
  if (!enableWorkspace) {
    installOnAllWorkspaces = false;
    installWorkspaceNames = [];
  }

  let binaryMirrors = {};

  if (inChina) {
    binaryMirrors = await utils.getBinaryMirrors(registry, { proxy, offline, cacheDir });
    if (customChinaMirrorUrl) {
      for (const key in binaryMirrors) {
        const item = binaryMirrors[key];
        if (item.host) {
          item.host = item.host.replace(globalConfig.chineseMirrorUrl, customChinaMirrorUrl);
        }
      }
    }

    // set env
    for (const key in binaryMirrors.ENVS) {
      env[key] = binaryMirrors.ENVS[key];
      if (customChinaMirrorUrl) {
        env[key] = env[key].replace(globalConfig.chineseMirrorUrl, customChinaMirrorUrl);
      }
    }
  }

  const config = {
    root,
    registry,
    pkgs,
    production,
    cacheStrict: argv['cache-strict'],
    cacheDir,
    env,
    binaryMirrors,
    forbiddenLicenses,
    flatten,
    proxy,
    prune,
    disableFallbackStore: argv['disable-fallback-store'],
    workspacesMap,
    // don't enable workspace on global install
    enableWorkspace,
    workspaceRoot: root,
    // install on workspaces root
    isWorkspaceRoot: true,
    // install on one workspace package
    isWorkspacePackage: false,
    offline,
  };
  config.strictSSL = getStrictSSL();
  // when ignore-scripts is set to `false` by user, npminstall will still
  // get config from npm settings instead of following user's specification,
  // should migrate to ?? or typeof.
  config.ignoreScripts = argv['ignore-scripts'] || getIgnoreScripts();
  config.foregroundScripts = argv['foreground-scripts'];
  config.ignoreOptionalDependencies = !argv.optional;
  config.detail = argv.detail;
  config.forceLinkLatest = !!argv['force-link-latest'];
  config.trace = argv.trace;
  config.engineStrict = argv['engine-strict'];
  config.registryOnly = argv['registry-only'];
  if (config.production || argv.global) {
    // make sure show detail on production install or global install
    config.detail = true;
  }
  config.client = argv.client;

  if (argv['tarball-url-mapping']) {
    const tarballUrlMapping = JSON.parse(argv['tarball-url-mapping']);
    config.formatNpmTarballUrl = function formatNpmTarballUrl(url) {
      for (const fromUrl in tarballUrlMapping) {
        const toUrl = tarballUrlMapping[fromUrl];
        url = url.replace(fromUrl, toUrl);
      }
      return url;
    };
  }

  if (argv['fix-bug-versions']) {
    const packageVersionMapping = await utils.getBugVersions(registry, { proxy, offline, cacheDir });
    config.autoFixVersion = function autoFixVersion(name, version) {
      const fixVersions = packageVersionMapping[name];
      return fixVersions && fixVersions[version] || null;
    };
  }

  const lockfilePath = argv['lockfile-path'];
  if (lockfilePath) {
    try {
      const lockfileData = await fs.readFile(lockfilePath, 'utf8');
      config.dependenciesTree = lockfileConverter(JSON.parse(lockfileData), {
        ignoreOptionalDependencies: true,
      });
    } catch (error) {
      console.warn(chalk.yellow('npminstall WARN load lockfile from %s error :%s'), lockfilePath, error.message);
    }
  }

  const dependenciesTree = argv['dependencies-tree'];
  if (dependenciesTree) {
    try {
      const content = await fs.readFile(dependenciesTree);
      config.dependenciesTree = JSON.parse(content);
    } catch (err) {
      console.warn(chalk.yellow('npminstall WARN load dependencies tree %s error: %s'), dependenciesTree, err.message);
    }
  }
  if (argv['save-dependencies-tree']) {
    config.saveDependenciesTree = true;
  }

  process.on('exit', code => {
    if (code !== 0) {
      writeFileSync(path.join(root, 'npminstall-debug.log'), util.inspect(config, { depth: 2 }));
    }
  });

  if (config.offline) {
    console.warn(chalk.yellow('npminstall WARN running on offline mode'));
  }

  // -g install to npm's global prefix
  if (argv.global) {
    // support custom prefix for global install
    const meta = utils.getGlobalInstallMeta(argv.prefix);
    config.targetDir = meta.targetDir;
    config.binDir = meta.binDir;

    // package's npm script can get root from `env.npm_rootpath`
    config.env.npm_rootpath = process.env.npm_rootpath || root;
    config.env.INIT_CWD = process.env.INIT_CWD || root;
    await installGlobal(config, context);
    console.log('');
    return;
  }

  if (pkgs.length === 0) {
    if (config.production) {
      // warning when `${root}/node_modules` exists
      const nodeModulesDir = path.join(root, 'node_modules');
      if (await utils.exists(nodeModulesDir)) {
        const dirs = await fs.readdir(nodeModulesDir);
        // ignore [ '.bin', 'node' ], it will install first by https://github.com/cnpm/nodeinstall
        if (!(dirs.length === 2 && dirs.indexOf('.bin') >= 0 && dirs.indexOf('node') >= 0)) {
          console.error(chalk.yellow(`npminstall WARN node_modules exists: ${nodeModulesDir}, contains ${dirs.length} dirs`));
        }
      }
    }
    const pkgFile = path.join(root, 'package.json');
    const exists = await utils.exists(pkgFile);
    if (!exists) {
      console.warn(chalk.yellow(`npminstall WARN package.json not exists: ${pkgFile}`));
    } else {
      // try to read npminstall config from package.json
      const pkg = await utils.readJSON(pkgFile);
      pkg.config = pkg.config || {};
      pkg.config.npminstall = pkg.config.npminstall || {};
      // {
      //   "config": {
      //     "npminstall": {
      //       "prune": true
      //     }
      //   }
      // }
      if (pkg.config.npminstall.prune === true) {
        config.prune = true;
      }
      // production
      if (config.production && pkg.config.npminstall['env:production']) {
        const envConfig = pkg.config.npminstall['env:production'];
        if (envConfig.prune === true) {
          config.prune = true;
        }
      }
      // development
      if (!config.production && pkg.config.npminstall['env:development']) {
        const envConfig = pkg.config.npminstall['env:development'];
        if (envConfig.prune === true) {
          config.prune = true;
        }
      }
    }
  }

  const installRootConfigs = [];
  if (config.enableWorkspace) {
    if (installOnAllWorkspaces) {
      // npm i --workspaces
      for (const workspaceRoot of workspaceRoots) {
        installRootConfigs.push({
          ...config,
          root: workspaceRoot,
          isWorkspaceRoot: false,
          isWorkspacePackage: true,
        });
      }
    } else if (installWorkspaceNames.length > 0) {
      // npm i --w foo
      const installWorkspaceInfos = await utils.getWorkspaceInfos(root, installWorkspaceNames, workspacesMap);
      if (installWorkspaceInfos.length === 0) {
        throw new Error(`No workspaces found: --workspace=${installWorkspaceNames.join(',')}`);
      }
      for (const { root: workspaceRoot } of installWorkspaceInfos) {
        installRootConfigs.push({
          ...config,
          root: workspaceRoot,
          isWorkspaceRoot: false,
          isWorkspacePackage: true,
        });
      }
    } else {
      if (pkgs.length === 0) {
        // workspace: npm i
        for (const workspaceRoot of workspaceRoots) {
          installRootConfigs.push({
            ...config,
            root: workspaceRoot,
            isWorkspaceRoot: false,
            isWorkspacePackage: true,
          });
        }
      }
      // workspace: npm i
      // workspace: npm i <name>
      installRootConfigs.push({
        ...config,
        root,
        isWorkspaceRoot: true,
        isWorkspacePackage: false,
      });
    }
  } else {
    // normal: npm i
    // normal: npm i <name>
    installRootConfigs.push({
      ...config,
      root,
      isWorkspaceRoot: true,
      isWorkspacePackage: false,
    });
  }

  // main installation logic
  for (const installConfig of installRootConfigs) {
    installConfig.env.npm_rootpath = process.env.npm_rootpath || installConfig.root;
    installConfig.env.INIT_CWD = process.env.INIT_CWD || installConfig.root;
    await installLocal(installConfig, context);
    console.log('');

    if (pkgs.length > 0) {
      // support --save, --save-dev, --save-optional, --save-client, --save-build and --save-isomorphic
      const map = {
        save: 'dependencies',
        'save-dev': 'devDependencies',
        'save-optional': 'optionalDependencies',
        'save-client': 'clientDependencies',
        'save-build': 'buildDependencies',
        'save-isomorphic': 'isomorphicDependencies',
      };
      // install saves any specified packages into dependencies by default.
      if (Object.keys(map).every(key => !argv[key]) && !argv['no-save']) {
        await updateDependencies(installConfig.root, pkgs, map.save, argv['save-exact'], installConfig.remoteNames);
      } else {
        for (const key in map) {
          if (argv[key]) {
            await updateDependencies(installConfig.root, pkgs, map[key], argv['save-exact'], installConfig.remoteNames);
          }
        }
      }
    }
  }
})().catch(err => {
  utils.exitWithError('npminstall', err);
});

let _versionSavePrefix = null;
function getVersionSavePrefix() {
  if (_versionSavePrefix === null) {
    try {
      _versionSavePrefix = execSync('npm config get save-prefix').toString().trim();
    } catch (err) {
      debug(`exec npm config get save-prefix ERROR: ${err.message}`);
      _versionSavePrefix = '^';
    }
  }
  return _versionSavePrefix;
}

function getStrictSSL() {
  try {
    const strictSSL = execSync('npm config get strict-ssl').toString().trim();
    return strictSSL !== 'false';
  } catch (err) {
    debug(`exec npm config get strict-ssl ERROR: ${err.message}`);
    return true;
  }
}

function getIgnoreScripts() {
  try {
    const ignoreScripts = execSync('npm config get ignore-scripts').toString().trim();
    return ignoreScripts === 'true';
  } catch (err) {
    debug(`exec npm config get ignore-scripts ERROR: ${err.message}`);
    return false;
  }
}

async function updateDependencies(root, pkgs, propName, saveExact, remoteNames) {
  const pkgFile = path.join(root, 'package.json');
  const pkg = await utils.readJSON(pkgFile);
  const deps = pkg[propName] = pkg[propName] || {};
  console.log('%s:', chalk.cyanBright(propName));
  for (const item of pkgs) {
    let saveName;
    let saveSpec;
    if (REMOTE_TYPES.includes(item.type)) {
      // if install from remote or git and don't specified name
      // get package's name from `remoteNames`
      if (item.name) {
        saveName = item.name;
        saveSpec = item.version;
      } else {
        saveName = remoteNames[item.version];
        saveSpec = item.version;
      }
    } else if (item.type === ALIAS_TYPES) {
      saveName = item.name;
      saveSpec = item.version;
    } else {
      let saveVersion;
      if (item.workspacePackage) {
        saveName = item.workspacePackage.name;
        saveVersion = item.workspacePackage.version || item.version;
      } else {
        const pkgDir = LOCAL_TYPES.includes(item.type) ? item.version : path.join(root, 'node_modules', item.name);
        const itemPkg = await utils.readJSON(path.join(pkgDir, 'package.json'));
        saveName = itemPkg.name;
        saveVersion = itemPkg.version;
      }
      // If install with `cnpm i foo`, the type is tag but rawSpec is empty string
      if (item.arg.type === 'tag' && item.arg.rawSpec) {
        saveSpec = item.arg.rawSpec;
      } else {
        const savePrefix = saveExact ? '' : getVersionSavePrefix();
        saveSpec = `${savePrefix}${saveVersion}`;
      }
    }
    deps[saveName] = saveSpec;
    console.log('%s %s %s', chalk.green('+'), chalk.bold(saveName), chalk.gray(saveSpec));
  }
  console.log('');
  // sort pkg[propName]
  const newDeps = {};
  for (const key of Object.keys(deps).sort()) {
    newDeps[key] = deps[key];
  }
  pkg[propName] = newDeps;
  await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
}
