#!/usr/bin/env node

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
const config = require('../lib/config');
const get = require('../lib/get');
const installLocal = require('..').installLocal;
const installGlobal = require('..').installGlobal;

const argv = parseArgs(process.argv.slice(2), {
  string: [
    'root',
    'registry',
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
  ],
  alias: {
    // npm install [-S|--save|-D|--save-dev|-O|--save-optional] [-E|--save-exact]
    S: 'save',
    D: 'save-dev',
    O: 'save-optional',
    E: 'save-exact',
    v: 'version',
    h: 'help',
    g: 'global',
    c: 'china',
    r: 'registry',
  },
});

if (argv.version) {
  console.log('v%s', require('../package.json').version);
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

Can specify one or more: npminstall ./foo.tgz bar@stable /some/folder
If no argument is supplied, installs dependencies from ./package.json.

Options:

  --production: won't install devDependencies
  --save, --save-dev, --save-optional, --save-exact: save installed dependencies into package.json
  -g, --global: install devDependencies to global directory which specified in '$npm config get prefix'
  -r, --registry: specify custom registry
  -c, --china: specify in china, will automatically using chinses npm registry and other binary's mirrors
`
  );
  process.exit(0);
}

const pkgs = [];

for (const name of argv._) {
  const p = npa(String(name));
  pkgs.push({ name: p.name, version: p.rawSpec });
}

const root = argv.root || process.cwd();
const production = argv.production || process.env.NODE_ENV === 'production';
let cacheDir = argv.cache === false ? '' : null;
if (production) {
  cacheDir = '';
}

// if in china, will automatic using chines registry and mirros.
const inChina = argv.china || !!process.env.npm_china;

let registry = argv.registry || process.env.npm_registry;
if (inChina) {
  registry = registry || config.chineseRegistry;
}
// for env.npm_config_registry
registry = registry || 'https://registry.npmjs.com';
const env = {
  npm_config_registry: registry,
};

if (inChina) {
  for (const key in config.chineseMirrorEnv) {
    env[key] = config.chineseMirrorEnv[key];
  }
}

// npm cli will auto set options to npm_xx env.
for (const key in argv) {
  const value = argv[key];
  if (value && typeof value === 'string') {
    env['npm_config_' + key] = value;
  }
}

debug('argv: %j, env: %j', argv, env);

co(function*() {
  let binaryMirrors = {};

  if (inChina) {
    const binaryMirrorUrl = registry + '/binary-mirror-config/latest';
    try {
      const res = yield get(binaryMirrorUrl, {
        dataType: 'json',
        followRedirect: true,
      });
      binaryMirrors = res.data.mirrors.china;
    } catch (err) {
      debug('Get %s error: %s', binaryMirrorUrl, err);
      binaryMirrors = require('binary-mirror-config/package.json').mirrors.china;
    }
  }

  const config = {
    root,
    registry,
    pkgs,
    production,
    cacheDir,
    env,
    binaryMirrors,
  };
  config.strictSSL = getStrictSSL();
  // -g install to npm's global prefix
  if (argv.global) {
    const npmPrefix = getPrefix();
    config.targetDir = path.join(npmPrefix, 'lib');
    config.binDir = path.join(npmPrefix, 'bin');
    yield installGlobal(config);
  } else {
    yield installLocal(config);
    if (pkgs.length > 0) {
      // support --save, --save-dev and --save-optional
      if (argv.save) {
        yield updateDependencies(root, pkgs, 'dependencies', argv['save-exact']);
      } else if (argv['save-dev']) {
        yield updateDependencies(root, pkgs, 'devDependencies', argv['save-exact']);
      } else if (argv['save-optional']) {
        yield updateDependencies(root, pkgs, 'optionalDependencies', argv['save-exact']);
      }
    }
  }

  process.on('exit', function(code) {
    if (code !== 0) {
      fs.writeFileSync('npminstall-debug.log', util.inspect(config, {depth: 2}));
    }
  });
}).catch(function(err) {
  console.error(chalk.red(err));
  console.error(chalk.red(err.stack));
  process.exit(1);
});

function getPrefix() {
  try {
    return execSync('npm config get prefix').toString().trim();
  } catch (err) {
    throw new Error(`exec npm config get prefix ERROR: ${err.message}`);
  }
}

function getVersionSavePrefix() {
  try {
    return execSync('npm config get save-prefix').toString().trim();
  } catch (err) {
    console.error(`exec npm config get save-prefix ERROR: ${err.message}`);
    return '^';
  }
}

function getStrictSSL() {
  try {
    const strictSSL = execSync('npm config get strict-ssl').toString().trim();
    return strictSSL !== 'false';
  } catch (err) {
    console.error(`exec npm config get strict-ssl ERROR: ${err.message}`);
    return true;
  }
}

function* updateDependencies(root, pkgs, propName, saveExact) {
  const savePrefix = saveExact ? '' : getVersionSavePrefix();
  const pkgFile = path.join(root, 'package.json');
  const pkg = yield utils.readJSON(pkgFile);
  const deps = pkg[propName] = pkg[propName] || {};
  for (const item of pkgs) {
    const itemPkg = yield utils.readJSON(path.join(root, 'node_modules', item.name, 'package.json'));
    deps[item.name] = `${savePrefix}${itemPkg.version}`;
  }
  yield fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2));
}
