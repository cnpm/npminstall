'use strict';

const os = require('os');

try {
  module.exports = require('./index.node');
} catch (_) {
  module.exports = require(`@cnpmcore/binding-${os.platform()}-${os.arch()}`);
}
