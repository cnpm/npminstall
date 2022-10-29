'use strict';

const assert = require('assert');

require('chair');

assert(require('object-pipeline/package.json').version === '1.0.1');
console.info('postinstall.');
