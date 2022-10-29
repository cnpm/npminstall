'use strict';

const os = require('os');

try {
  module.exports = require('./index.node');
} catch (_) {
  if (os.platform() === 'win32') {
    module.exports = () => {
      throw new Error('Not support windows');
    };
  } else {
    module.exports = require(`@cnpmjs/binding-${os.platform()}-${os.arch()}`);
  }
}
