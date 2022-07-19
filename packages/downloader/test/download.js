'use strict';

const path = require('path');
const urllib = require('urllib');
const mkdirp = require('mz-modules/mkdirp');
const fs = require('fs');
const downloadDir = path.join(__dirname, './fixtures/tar');
const tree = require('./fixtures/tree.json');
const pMap = require('p-map');
const sleep = require('mz-modules/sleep');

async function download() {
  await prepareDir();
  const pkgs = await getPackages();
  await pMap(pkgs, pkg => downloadDependencies(pkg), 5);
}

async function prepareDir() {
  await mkdirp(downloadDir);
}

async function getPackages() {
  const result = {};
  for (const [ path, pkg ] of Object.entries(tree.packages)) {
    const prefix = 'node_modules/';
    const prefixIndex = path.lastIndexOf(prefix);
    if (prefixIndex < 0) continue;
    const name = path.substr(prefixIndex + prefix.length);
    result[`${name}@${pkg.version}`] = {
      name,
      version: pkg.version,
      resolved: pkg.resolved,
    };
  }
  return Object.values(result);
}

async function downloadDependencies(pkg) {
  const nameIndex = pkg.name.indexOf('/');
  const scope = nameIndex >= 0 ? pkg.name.substr(0, nameIndex) : null;
  const name = nameIndex >= 0 ? pkg.name.substr(nameIndex + 1) : pkg.name;
  const fileName = `${name}-${pkg.version}.tgz`;
  const tgzPath = scope ? path.join(downloadDir, scope, fileName) : path.join(downloadDir, fileName);
  const baseDir = path.dirname(tgzPath);
  await mkdirp(baseDir);
  let retryTime = 0;
  const retryLimit = 10;
  let err;
  while (retryTime++ < retryLimit) {
    try {
      const writeStream = fs.createWriteStream(tgzPath);
      await urllib.request(pkg.resolved, {
        followRedirect: true,
        writeStream,
        timeout: [ 30 * 1000, 30 * 1000 ],
      });
      return;
    } catch (e) {
      err = e;
      console.warn(`download ${pkg.resolved} failed ${retryTime}/${retryLimit} ${e.message}`);
      await sleep(100);
    }
  }
  throw err;
}

(async () => {
  try {
    await download();
    process.exit(0);
  } catch (e) {
    console.log('download error: ', e);
    process.exit(1);
  }
})();
