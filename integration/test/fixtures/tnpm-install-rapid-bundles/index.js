'use strict';

const assert = require('assert');
const semver = require('semver');

require('chair');

const bundledPkgVersion = require('_nyc@13.3.0@nyc/node_modules/istanbul-lib-coverage/package.json').version;
assert(bundledPkgVersion === '2.0.3');

assert(semver.gt(require('istanbul-lib-coverage/package.json').version, bundledPkgVersion));
