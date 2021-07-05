'use strict';


// @see npa: https://github.com/npm/npm-package-arg#result-object

// 本地 spec 类型，npa@^4 只有 local，npa@^8 细分成两种
exports.LOCAL_TYPES = [
  'file',
  'directory',
];

// registry 类型，补集是 git|file|directory|remote
exports.REGISTRY_TYPES = [
  'tag',
  'version',
  'range',
];

exports.REMOTE_TYPES = [
  'remote',
  'git',
];

exports.ALIAS_TYPES = 'alias';
