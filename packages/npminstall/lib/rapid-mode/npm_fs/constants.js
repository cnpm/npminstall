'use strict';


const NpmFsMode = {
  NPM: 'npm',
  NPMINSTALL: 'npminstall',
};

const PREFIX_LENGTH = 'node_modules/'.length;

const NpmFs = {
  native: 'native', // 默认模式
  rapid: 'rapid', // 极速模式
};


exports.NpmFsMode = NpmFsMode;
exports.NpmFs = NpmFs;
exports.PREFIX_LENGTH = PREFIX_LENGTH;
