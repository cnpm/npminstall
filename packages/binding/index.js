'use strict';

const os = require('os');

try {
  module.exports = require('./index.node');
} catch (_) {
  module.exports = require(`@cnpmjs/binding-${os.platform()}-${os.arch()}`);
}
