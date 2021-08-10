'use strict';

const npminstall = require('..');
const config = require('../lib/config');
const utils = require('../lib/utils');
const Nested = require('../lib/nested');

module.exports = async options => {
  await formatOptions(options);
  return await npminstall(options);
};

module.exports.installGlobal = async options => {
  await formatOptions(options);
  return await npminstall.installGlobal(options);
};

async function formatOptions(options) {
  if (process.env.local) {
    options.registry = config.chineseRegistry;
    options.binaryMirrors = await utils.getBinaryMirrors(options.registry);
    options.env = options.env || {};
    for (const key in options.binaryMirrors.ENVS) {
      options.env[key] = options.binaryMirrors.ENVS[key];
    }
  }
  if (options.customBinaryMirrors) {
    options.binaryMirrors = options.binaryMirrors || {};
    for (const key in options.customBinaryMirrors) {
      options.binaryMirrors[key] = options.customBinaryMirrors[key];
    }
  }

  options.nested = new Nested([]);
}
