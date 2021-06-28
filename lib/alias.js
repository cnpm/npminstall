'use strict';

const npa = require('npm-package-arg');

exports.parsePackageName = pkgName => {
  const p = npa(pkgName);
  const {
    name,
    type,
    subSpec,
  } = p;

  const isAlias = type === 'alias';

  const realPackageName = isAlias ? subSpec.name : name;
  // normal package name `aliasPackageName` should be undefined
  const aliasPackageName = isAlias ? name : undefined;

  return [ aliasPackageName, realPackageName ];
};

exports.getAliasPackageName = (aliasPackageName, name, version) => {
  if (aliasPackageName) {
    return npa({
      name: aliasPackageName,
      rawSpec: `npm:${name}@${version}`,
    }).toString();
  }

  return `${name}@${version}`;
};
