'use strict';

const rimraf = require('mz-modules/rimraf');
const mkdirp = require('mz-modules/mkdirp');
const path = require('path');

const fixtures = path.join(__dirname, 'fixtures');

exports.cleanup = function* (dirs) {
  for (let i = 0; i < dirs.length; i++) {
    yield rimraf(path.join(dir, 'node_modules'));
  }
};

exports.fixtures = function(name) {
  return path.join(fixtures, name);
};

exports.tmp = function(name) {
  const dir = exports.fixtures(name || 'tmp');
  const cleanup = function* () {
    yield rimraf(dir);
    yield mkdirp(dir);
  };
  return [ dir, cleanup ];
};

exports.npminstall = path.join(__dirname, '..', 'bin', 'install.js');

exports.readJSON = require('../lib/utils').readJSON;
