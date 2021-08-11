'use strict';

const npminstall = require('..');
const config = require('../lib/config');
const utils = require('../lib/utils');
const Context = require('../lib/context');

const context = new Context();

module.exports = async options => {
  await formatOptions(options);
  return await npminstall(options, context);
};

module.exports.installGlobal = async options => {
  await formatOptions(options);
  return await npminstall.installGlobal(options, context);
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
}
