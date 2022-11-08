'use strict';

const assert = require('assert')

const version = require('npm').version;

assert(version === '6.14.11')
