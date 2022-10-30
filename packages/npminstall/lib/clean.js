'use strict';

const path = require('path');
const pMap = require('p-map');
const fs = require('fs/promises');
const mapWorkspaces = require('@npmcli/map-workspaces');
const nydusd = require('./rapid-mode/nydusd');
const { readPackageJSON } = require('./utils');
const { getWorkdir } = require('./rapid-mode/util');

async function cleanProject(cwd) {
  const mode = await nydusd.getNydusMode(cwd);
  const { overlay } = await getWorkdir(cwd);

  try {
    await fs.stat(overlay);
    await nydusd.endNydusFs(mode, cwd, readPkgJSON(cwd).pkg);
  } catch (_) {
    await nativeClean(cwd);
  }
}

async function nativeClean(cwd) {
  const mappedWorkspaces = await mapWorkspaces({
    cwd,
    pkg: readPackageJSON(cwd),
  });
  const workspaces = Array.from(mappedWorkspaces.values());
  workspaces.push(cwd);
  await pMap(workspaces, async workspace => {
    const nmdir = path.join(workspace, 'node_modules');
    console.log('[tnpm] removing %s', nmdir);
    await fs.rm(nmdir, { recursive: true, force: true });
  }, { concurrency: 10 });
}

module.exports = cleanProject;
