'use strict';

const { rimraf, mkdirp } = require('../lib/utils');
const path = require('path');

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
  const dir = exports.fixtures(name || 'tmp');
  const cleanup = async () => {
    await rimraf(dir);
    await mkdirp(dir);
  };
  return [ dir, cleanup ];
};

exports.npminstall = path.join(__dirname, '..', 'bin', 'install.js');

exports.readJSON = require('../lib/utils').readJSON;
