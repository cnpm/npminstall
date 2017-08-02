#!/usr/bin/env node

'use strict';

const debug = require('debug')('npminstall:bin:install');
const co = require('co');
const npa = require('npm-package-arg');
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

const orignalArgv = process.argv.slice(2);
const argv = parseArgs(orignalArgv, {
  string: [
    'root',
    'registry',
    'prefix',
    'forbidden-licenses',
    'custom-china-mirror-url',
    // {"http://a.com":"http://b.com"}
    'tarball-url-mapping',
    'proxy',
  ],
  boolean: [
    'version',
    'help',
    'production',
    'global',
    'save',
    'save-dev',
    'save-optional',
    // Saved dependencies will be configured with an exact version rather than using npm's default semver range operator.
    'save-exact',
    'china',
    'ignore-scripts',
    'detail',
    'trace',
    'engine-strict',
    'flatten',
    'registry-only',
    'cache-strict',
  ],
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
});

if (argv.version) {
  console.log(`npminstall v${require('../package.json').version}`);
  process.exit(0);
}

if (argv.help) {
  console.log(
`
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
  --save, --save-dev, --save-optional, --save-exact: save installed dependencies into package.json
  -g, --global: install devDependencies to global directory which specified in '$npm config get prefix'
  -r, --registry: specify custom registry
  -c, --china: specify in china, will automatically using chinses npm registry and other binary's mirrors
  -d, --detail: show detail log of installation
  --trace: show memory and cpu usages traces of installation
  --ignore-scripts: ignore all preinstall / install and postinstall scripts during the installation
  --forbidden-licenses: forbit install packages which used these licenses
  --engine-strict: refuse to install (or even consider installing) any package that claims to not be compatible with the current Node.js version.
  --flatten: flatten dependencies by matching ancestors' dependencies
  --registry-only: make sure all packages install from registry. Any package is installed from remote(e.g.: git, remote url) cause install fail.
  --cache-strict: use disk cache even on production env.
`
  );
  process.exit(0);
}

const pkgs = [];

if (process.env.NPMINSTALL_BY_UPDATE) {
  // ignore all package names on update
  argv._ = [];
}

for (const name of argv._) {
  const p = npa(String(name));
  pkgs.push({ name: p.name, version: p.rawSpec, type: p.type });
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

let forbiddenLicenses = argv['forbidden-licenses'];
forbiddenLicenses = forbiddenLicenses ? forbiddenLicenses.split(',') : null;

const flatten = argv.flatten;

// if in china, will automatic using chines registry and mirros.
const inChina = argv.china || !!process.env.npm_china;
// if exists, override default china mirror url
const customChinaMirrorUrl = argv['custom-china-mirror-url'];

let registry = argv.registry || process.env.npm_registry;
if (inChina) {
  registry = registry || globalConfig.chineseRegistry;
}
// for env.npm_config_registry
registry = registry || 'https://registry.npmjs.org';

const proxy = argv.proxy || process.env.npm_proxy || process.env.npm_config_proxy;

const env = {
  npm_config_registry: registry,
  // set npm_config_argv
  // see https://github.com/cnpm/npminstall/issues/121#issuecomment-247836741
  npm_config_argv: JSON.stringify({
    remain: [],
    cooked: orignalArgv,
    original: orignalArgv,
  }),
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

co(function* () {
  let binaryMirrors = {};

  if (inChina) {
    binaryMirrors = yield utils.getBinaryMirrors(registry, { proxy });
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
  };
  config.strictSSL = getStrictSSL();
  config.ignoreScripts = argv['ignore-scripts'] || getIgnoreScripts();
  config.detail = argv.detail;
  config.trace = argv.trace;
  config.engineStrict = argv['engine-strict'];
  config.registryOnly = argv['registry-only'];
  if (config.production || argv.global) {
    // make sure show detail on production install or global install
    config.detail = true;
  }

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

  // -g install to npm's global prefix
  if (argv.global) {
    // support custom prefix for global install
    const meta = utils.getGlobalInstallMeta(argv.prefix);
    config.targetDir = meta.targetDir;
    config.binDir = meta.binDir;
    yield installGlobal(config);
  } else {
    if (pkgs.length === 0) {
      if (config.production) {
        // warning when `${root}/node_modules` exists
        const nodeModulesDir = path.join(root, 'node_modules');
        if (yield fs.exists(nodeModulesDir)) {
          console.error(chalk.yellow(`npminstall WARN node_modules exists: ${nodeModulesDir}`));
        }
      }
      const pkgFile = path.join(root, 'package.json');
      const exists = yield fs.exists(pkgFile);
      if (!exists) {
        console.warn(chalk.yellow(`npminstall WARN package.json not exists: ${pkgFile}`));
      }
    }
    yield installLocal(config);
    if (pkgs.length > 0) {
      // support --save, --save-dev and --save-optional
      if (argv.save) {
        yield updateDependencies(root, pkgs, 'dependencies', argv['save-exact'], config.remoteNames);
      } else if (argv['save-dev']) {
        yield updateDependencies(root, pkgs, 'devDependencies', argv['save-exact'], config.remoteNames);
      } else if (argv['save-optional']) {
        yield updateDependencies(root, pkgs, 'optionalDependencies', argv['save-exact'], config.remoteNames);
      }
    }
  }

  process.on('exit', code => {
    if (code !== 0) {
      fs.writeFileSync(path.join(root, 'npminstall-debug.log'), util.inspect(config, { depth: 2 }));
    }
  });
}).catch(err => {
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

function* updateDependencies(root, pkgs, propName, saveExact, remoteNames) {
  const savePrefix = saveExact ? '' : getVersionSavePrefix();
  const pkgFile = path.join(root, 'package.json');
  const pkg = yield utils.readJSON(pkgFile);
  const deps = pkg[propName] = pkg[propName] || {};
  for (const item of pkgs) {
    if ([ 'remote', 'hosted', 'git' ].indexOf(item.type) >= 0) {
      // if install from remote or git and don't specified name
      // get package's name from `remoteNames`
      item.name
        ? deps[item.name] = item.version
        : deps[remoteNames[item.version]] = item.version;
    } else {
      const pkgDir = item.type === 'local' ? item.version : path.join(root, 'node_modules', item.name);
      const itemPkg = yield utils.readJSON(path.join(pkgDir, 'package.json'));
      deps[itemPkg.name] = `${savePrefix}${itemPkg.version}`;
    }
  }
  // sort pkg[propName]
  const newDeps = {};
  for (const key of Object.keys(deps).sort()) {
    newDeps[key] = deps[key];
  }
  pkg[propName] = newDeps;
  yield fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
}
