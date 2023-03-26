#!/usr/bin/env node

const path = require('node:path');
const parseArgs = require('minimist');
const {
  rimraf, readWorkspaces, getWorkspaceInfos, formatWorkspaceNames, exitWithError,
} = require('../lib/utils');

function help(root) {
  console.log(`
Usage:

  npmupdate [--root=${root}]
`
  );
  process.exit(0);
}

(async () => {
  const argv = parseArgs(process.argv.slice(2), {
    string: [
      'root',
      'workspace',
    ],
    boolean: [
      'help',
      'clean-only',
    ],
    alias: {
      h: 'help',
      w: 'workspace',
    },
  });

  const root = argv.root || process.cwd();
  if (argv.help) return help(root);
  const installWorkspaceNames = formatWorkspaceNames(argv);
  const { workspaceRoots, workspacesMap } = await readWorkspaces(root);
  let cleanRoots = [];
  if (installWorkspaceNames.length > 0) {
    const installWorkspaceInfos = await getWorkspaceInfos(root, installWorkspaceNames, workspacesMap);
    if (installWorkspaceInfos.length === 0) {
      throw new Error(`No workspaces found: --workspace=${installWorkspaceNames.join(',')}`);
    }
    cleanRoots = [ root, ...installWorkspaceInfos.map(info => info.root) ];
  } else {
    cleanRoots = [ root, ...workspaceRoots ];
  }
  for (const rootDir of cleanRoots) {
    const nodeModules = path.join(rootDir, 'node_modules');
    console.log('[npmupdate] removing %s', nodeModules);
    await rimraf(nodeModules);
  }
  if (argv['clean-only']) {
    console.log('');
    return;
  }

  console.log('[npmupdate] reinstall on %s', root);
  // make sure install ignore all package names
  process.env.NPMINSTALL_BY_UPDATE = 'true';
  require('./install');
})().catch(err => {
  exitWithError('npmupdate', err);
});
