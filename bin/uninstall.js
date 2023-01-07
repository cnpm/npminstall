#!/usr/bin/env node

const debug = require('util').debuglog('npminstall:bin:uninstall');
const path = require('path');
const npa = require('npm-package-arg');
const parseArgs = require('minimist');
const chalk = require('chalk');
const utils = require('../lib/utils');
const uninstall = require('../lib/uninstall');

const argv = parseArgs(process.argv.slice(2), {
  string: [
    'root',
    'prefix',
    'workspace',
  ],
  boolean: [
    'version',
    'help',
    'global',
    'ignore-scripts',
    'workspaces',
  ],
  alias: {
    v: 'version',
    h: 'help',
    g: 'global',
    w: 'workspace',
  },
});

if (argv.version) {
  console.log('v%s', require('../package.json').version);
  process.exit(0);
}

if (argv.help) help();

const pkgs = [];

for (const name of argv._) {
  const p = npa(String(name));
  pkgs.push({ name: p.name, version: p.rawSpec });
}

if (!pkgs.length) help();

(async () => {
  const root = argv.root || process.cwd();
  const config = {
    root,
    pkgs,
    global: argv.global,
    targetDir: root,
    binDir: path.join(root, 'node_modules/.bin'),
  };

  if (argv.global) {
    // support custom prefix for global install
    // support custom prefix for global install
    const meta = utils.getGlobalInstallMeta(argv.prefix);
    config.targetDir = meta.targetDir;
    config.binDir = meta.binDir;
    debug('uninstall global package in %s with pkg: $j, config: %j', root, pkgs, config);
    await uninstall(config);
    return;
  }

  const installWorkspaceNames = utils.formatWorkspaceNames(argv);
  const { workspaceRoots, workspacesMap } = await utils.readWorkspaces(root);
  let uninstallRoots = [];
  const enableWorkspace = workspacesMap.size > 0;
  if (enableWorkspace) {
    if (installWorkspaceNames.length > 0) {
      const installWorkspaceInfos = await utils.getWorkspaceInfos(root, installWorkspaceNames, workspacesMap);
      if (installWorkspaceInfos.length === 0) {
        throw new Error(`No workspaces found: --workspace=${installWorkspaceNames.join(',')}`);
      }
      uninstallRoots = installWorkspaceInfos.map(info => info.root);
    } else {
      uninstallRoots = workspaceRoots;
    }
  } else {
    uninstallRoots = [ root ];
  }

  for (const uninstallRoot of uninstallRoots) {
    const unsinstallRootConfig = {
      ...config,
      root: uninstallRoot,
      targetDir: uninstallRoot,
      enableWorkspace,
      workspaceRoot: root,
    };
    debug('uninstall in %s with pkg: $j, config: %j', uninstallRoot, pkgs, unsinstallRootConfig);
    await uninstall(unsinstallRootConfig);
  }
})().catch(err => {
  console.error(chalk.red(err));
  console.error(chalk.red(err.stack));
  process.exit(1);
});

function help() {
  console.log(`
Usage:

  npmuninstall <pkg>
  npmuninstall <pkg>@<version>
  npmuninstall <pkg>@<version> [<pkg>@<version>]
`
  );
  process.exit(0);
}
