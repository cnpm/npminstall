'use strict';

// https://github.com/nodejs/node/blob/master/test/addons/hello-world/test.js

const assert = require('assert');
const binding = require('./build/Release/binding');

assert.equal('world', binding.hello());
console.log('binding.hello() =', binding.hello());
