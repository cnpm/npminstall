'use strict';

const npa = require('./npa');

exports.parsePackageName = (pkgName, nested) => {
  const p = npa(pkgName, { nested });
  const {
    name,
    type,
    raw,
    subSpec,
  } = p;

  const isAlias = type === 'alias';

  const realPackageName = isAlias ? subSpec.raw : raw;
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
