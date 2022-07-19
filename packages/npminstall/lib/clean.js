'use strict';

const path = require('path');
const nydusd = require('./rapid-mode/nydusd');
const {
  NYDUS_TYPE,
} = require('./rapid-mode/constants');
const { readJSON, rimraf } = require('./utils');

const { getWorkdir } = require('./rapid-mode/util');
const fs = require('fs');
const util = require('util');
const exists = util.promisify(fs.exists);

async function cleanProject(cwd) {
  const mode = await nydusd.getNydusMode(cwd);
  const { dirname } = await getWorkdir(cwd);

  if (mode === NYDUS_TYPE.NONE && !(await exists(path.dirname(dirname)))) {
    return nativeClean(cwd);
  }

  await nydusd.endNydusFs(mode, cwd, readJSON(path.join(cwd, 'package.json')));
}

async function nativeClean(cwd) {
  const nodeModulesDir = path.join(cwd, 'node_modules');
  console.log('[npminstall] removing %s', nodeModulesDir);
  await rimraf(nodeModulesDir);
}

module.exports = cleanProject;
