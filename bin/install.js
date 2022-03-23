#!/usr/bin/env node

'use strict';

const debug = require('debug')('npminstall:bin:install');
const npa = require('../lib/npa');
const chalk = require('chalk');
const path = require('path');
const util = require('util');
const execSync = require('child_process').execSync;
const fs = require('mz/fs');
const parseArgs = require('minimist');
const utils = require('../lib/utils');
const globalConfig = require('../lib/config');
const installLocal = require('..').installLocal;
const installGlobal = require('..').installGlobal;
const { parsePackageName } = require('../lib/alias');
const {
  LOCAL_TYPES,
  REMOTE_TYPES,
  ALIAS_TYPES,
} = require('../lib/npa_types');
const Context = require('../lib/context');

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
  npminstall <pkg>@<tag>
  npminstall <pkg>@<version>
  npminstall <pkg>@<version range>
  npminstall <folder>
  npminstall <tarball file>
  npminstall <tarball url>
  npminstall <git:// url>
  npminstall <github username>/<github project>
  npminstall --proxy=http://localhost:8080

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
  --trace: show memory and cpu usages traces of installation
  --ignore-scripts: ignore all preinstall / install and postinstall scripts during the installation
  --no-optional: ignore all optionalDependencies during the installation
  --forbidden-licenses: forbit install packages which used these licenses
  --engine-strict: refuse to install (or even consider installing) any package that claims to not be compatible with the current Node.js version.
  --flatten: flatten dependencies by matching ancestors' dependencies
  --registry-only: make sure all packages install from registry. Any package is installed from remote(e.g.: git, remote url) cause install fail.
  --cache-strict: use disk cache even on production env.
  --fix-bug-versions: auto fix bug version of package.
  --prune: prune unnecessary files from ./node_modules, such as markdown, typescript source files, and so on.
  --high-speed-store: specify high speed store script to cache tgz files, and so on. Should export '* getStream(url)' function.
  --dependencies-tree: install with dependencies tree to restore the last install.
  --force-link-latest: force link latest version package to module root path.
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
  });
}

let root = argv.root || process.cwd();
if (Array.isArray(root)) {
  // use last one, e.g.: $ npminstall --root=abc --root=def
  root = root[root.length - 1];
}
const production = argv.production || process.env.NODE_ENV === 'production';
let cacheDir = argv.cache === false ? '' : null;
if (production) {
  cacheDir = '';
}
// support npm_config_cache to change default cache dir
if (cacheDir === null && process.env.npm_config_cache) {
  cacheDir = process.env.npm_config_cache;
}

let forbiddenLicenses = argv['forbidden-licenses'];
forbiddenLicenses = forbiddenLicenses ? forbiddenLicenses.split(',') : null;

const flatten = argv.flatten;
const prune = argv.prune;

// if in china, will automatic using chines registry and mirros.
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
};
// https://github.com/npm/npm/blob/2005f4ce11f6cdf142f8a77f4f7ee4996000fb57/lib/utils/lifecycle.js#L67
env.npm_node_execpath = env.NODE = process.env.NODE || process.execPath;
env.npm_execpath = require.main.filename;

// package's npm script can get root from `env.npm_rootpath`
env.npm_rootpath = process.env.npm_rootpath || root;

// npm cli will auto set options to npm_xx env.
for (const key in argv) {
  const value = argv[key];
  if (value && typeof value === 'string') {
    env['npm_config_' + key] = value;
  }
}

debug('argv: %j, env: %j', argv, env);

(async () => {
  let binaryMirrors = {};

  if (inChina) {
    binaryMirrors = await utils.getBinaryMirrors(registry, { proxy });
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
    disableDedupe: argv['disable-dedupe'],
  };
  config.strictSSL = getStrictSSL();
  config.ignoreScripts = argv['ignore-scripts'] || getIgnoreScripts();
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
    config.formatNpmTarbalUrl = function formatNpmTarbalUrl(url) {
      for (const fromUrl in tarballUrlMapping) {
        const toUrl = tarballUrlMapping[fromUrl];
        url = url.replace(fromUrl, toUrl);
      }
      return url;
    };
  }

  if (argv['fix-bug-versions']) {
    const packageVersionMapping = await utils.getBugVersions(registry, { proxy });
    config.autoFixVersion = function autoFixVersion(name, version) {
      const fixVersions = packageVersionMapping[name];
      return fixVersions && fixVersions[version] || null;
    };
  }

  const dependenciesTree = argv['dependencies-tree'];
  if (dependenciesTree) {
    try {
      const content = fs.readFileSync(dependenciesTree);
      config.dependenciesTree = JSON.parse(content);
    } catch (err) {
      console.warn(chalk.yellow('npminstall WARN load dependencies tree %s error: %s'), dependenciesTree, err.message);
    }
  }
  if (argv['save-dependencies-tree']) {
    config.saveDependenciesTree = true;
  }

  if (argv['high-speed-store']) {
    config.highSpeedStore = require(argv['high-speed-store']);
  }

  // -g install to npm's global prefix
  if (argv.global) {
    // support custom prefix for global install
    const meta = utils.getGlobalInstallMeta(argv.prefix);
    config.targetDir = meta.targetDir;
    config.binDir = meta.binDir;
    await installGlobal(config, context);
  } else {
    if (pkgs.length === 0) {
      if (config.production) {
        // warning when `${root}/node_modules` exists
        const nodeModulesDir = path.join(root, 'node_modules');
        if (await fs.exists(nodeModulesDir)) {
          const dirs = await fs.readdir(nodeModulesDir);
          // ignore [ '.bin', 'node' ], it will install first by https://github.com/cnpm/nodeinstall
          if (!(dirs.length === 2 && dirs.indexOf('.bin') >= 0 && dirs.indexOf('node') >= 0)) {
            console.error(chalk.yellow(`npminstall WARN node_modules exists: ${nodeModulesDir}, contains ${dirs.length} dirs`));
          }
        }
      }
      const pkgFile = path.join(root, 'package.json');
      const exists = await fs.exists(pkgFile);
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
        if (pkg.config.npminstall.disableDedupe === true) {
          config.disableDedupe = true;
        }
        // env config
        // {
        //   "config": {
        //     "npminstall": {
        //       "env:production": {
        //         "disableDedupe": true
        //       }
        //     }
        //   }
        // }
        // production
        if (config.production && pkg.config.npminstall['env:production']) {
          const envConfig = pkg.config.npminstall['env:production'];
          if (envConfig.prune === true) {
            config.prune = true;
          }
          if (envConfig.disableDedupe === true) {
            config.disableDedupe = true;
          }
        }
        // development
        if (!config.production && pkg.config.npminstall['env:development']) {
          const envConfig = pkg.config.npminstall['env:development'];
          if (envConfig.prune === true) {
            config.prune = true;
          }
          if (envConfig.disableDedupe === true) {
            config.disableDedupe = true;
          }
        }
      }
    }
    await installLocal(config, context);
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

      //    install saves any specified packages into dependencies by default.
      if (Object.keys(map).every(key => !argv[key]) && !argv['no-save']) {
        await updateDependencies(root, pkgs, map.save, argv['save-exact'], config.remoteNames);
      } else {
        for (const key in map) {
          if (argv[key]) await updateDependencies(root, pkgs, map[key], argv['save-exact'], config.remoteNames);
        }
      }

    }
  }

  process.on('exit', code => {
    if (code !== 0) {
      fs.writeFileSync(path.join(root, 'npminstall-debug.log'), util.inspect(config, { depth: 2 }));
    }
  });
})().catch(err => {
  console.error(chalk.red(err.stack));
  console.error(chalk.yellow('npminstall version: %s'), require('../package.json').version);
  console.error(chalk.yellow('npminstall args: %s'), process.argv.join(' '));
  process.exit(1);
});

function getVersionSavePrefix() {
  try {
    return execSync('npm config get save-prefix').toString().trim();
  } catch (err) {
    debug(`exec npm config get save-prefix ERROR: ${err.message}`);
    return '^';
  }
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
  const savePrefix = saveExact ? '' : getVersionSavePrefix();
  const pkgFile = path.join(root, 'package.json');
  const pkg = await utils.readJSON(pkgFile);
  const deps = pkg[propName] = pkg[propName] || {};
  for (const item of pkgs) {
    if (REMOTE_TYPES.includes(item.type)) {
      // if install from remote or git and don't specified name
      // get package's name from `remoteNames`
      item.name
        ? deps[item.name] = item.version
        : deps[remoteNames[item.version]] = item.version;
    } else if (item.type === ALIAS_TYPES) {
      deps[item.name] = item.version;
    } else {
      const pkgDir = LOCAL_TYPES.includes(item.type) ? item.version : path.join(root, 'node_modules', item.name);
      const itemPkg = await utils.readJSON(path.join(pkgDir, 'package.json'));
      deps[itemPkg.name] = `${savePrefix}${itemPkg.version}`;
    }
  }
  // sort pkg[propName]
  const newDeps = {};
  for (const key of Object.keys(deps).sort()) {
    newDeps[key] = deps[key];
  }
  pkg[propName] = newDeps;
  await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
}
