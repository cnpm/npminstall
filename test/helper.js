const path = require('path');
const { randomUUID } = require('crypto');
const { rimraf, mkdirp } = require('../lib/utils');

const fixtures = path.join(__dirname, 'fixtures');

exports.cleanup = (...dirs) => {
  return async () => {
    await Promise.all(dirs.map(dir => rimraf(path.join(dir, 'node_modules'))));
  };
};

exports.fixtures = name => {
  return path.join(fixtures, name);
};

exports.tmp = name => {
  const dir = exports.fixtures(name || `.tmp_${randomUUID()}`);
  const cleanup = async () => {
    try {
      // avoid Error: ENOTEMPTY: directory not empty, rmdir
      await rimraf(dir);
    } catch (_) {
      // ignore error
    }
    await mkdirp(dir);
  };
  return [ dir, cleanup ];
};

exports.npminstall = path.join(__dirname, '..', 'bin', 'install.js');
exports.npmupdate = path.join(__dirname, '..', 'bin', 'update.js');

exports.readJSON = require('../lib/utils').readJSON;
