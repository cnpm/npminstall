'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const validate = require('validate-npm-package-name');
const os = require('os');

const stat = util.promisify(fs.stat);
const ALIAS_DELIMITER = '@npm:';

exports.parsePackageName = pkgName => {
  const matches = pkgName.split(ALIAS_DELIMITER);

  const realPackageName = matches.pop();
  // normal package name `aliasPackageName` should be undefined
  const aliasPackageName = matches.pop();

  if (aliasPackageName) {
    const {
      validForOldPackages,
      errors,
      warnings,
    } = validate(aliasPackageName);

    if (warnings && warnings.length) {
      console.warn(`[npminstall] alias name (${aliasPackageName}) invalid for new packages. warnings: ${warnings.join(os.EOL)}`);
    }

    if (validForOldPackages) {
      return [ aliasPackageName, realPackageName ];
    }

    throw new Error(`[npminstall] alias name (${aliasPackageName}) invalid. errors: ${errors.join(os.EOL)}`);
  }

  return [ aliasPackageName, realPackageName ];

};

exports.checkAliasConflict = async (nodeModulesPath, aliasPackageName) => {
  try {
    await stat(path.join(nodeModulesPath, aliasPackageName));
    return false;
  } catch (error) {
    console.warn(`[npminstall] current alias package(${aliasPackageName}) got conflicted, better use another alias name.`);
    return true;
  }
};

exports.getAliasPackageName = (aliasPackageName, name, version) => {
  if (aliasPackageName) {
    return `${aliasPackageName}${ALIAS_DELIMITER}${name}@${version}`;
  }

  return `${name}@${version}`;
};
