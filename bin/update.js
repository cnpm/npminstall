#!/usr/bin/env node

const path = require('path');
const parseArgs = require('minimist');
const { rimraf, readWorkspaces, getWorkspaceInfo } = require('../lib/utils');

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

  let root = argv.root || process.cwd();
  if (argv.help) return help(root);
  const installWorkspaceName = argv.workspace;
  const { workspaceRoots, workspacesMap } = await readWorkspaces(root);
  let roots = [];
  if (installWorkspaceName) {
    const installWorkspaceInfo = await getWorkspaceInfo(root, installWorkspaceName, workspacesMap);
    if (!installWorkspaceInfo) {
      throw new Error(`No workspaces found: --workspace=${installWorkspaceName}`);
    }
    root = installWorkspaceInfo.root;
    roots.push(root);
  } else {
    roots = [ root, ...workspaceRoots ];
  }
  for (const rootDir of roots) {
    const nodeModules = path.join(rootDir, 'node_modules');
    console.log('[npmupdate] removing %s', nodeModules);
    await rimraf(nodeModules);
  }
  if (argv['clean-only']) return;

  console.log('[npmupdate] reinstall on %s', root);
  // make sure install ignore all package names
  process.env.NPMINSTALL_BY_UPDATE = 'true';
  require('./install');
})().catch(err => {
  console.error(err);
  process.exit(-1);
});
