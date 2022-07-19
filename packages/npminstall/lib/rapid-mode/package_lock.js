'use strict';

const path = require('path');
const mapWorkspaces = require('@npmcli/map-workspaces');

const DATA = Symbol('PackageLock#json');
const WORKSPACES = Symbol('PackageLock#workspaces');
const DEFAULT_PACKAGE_FILE = 'package.json';


// package-lock.json 抽象
class PackageLock {
  constructor({
    cwd,
    packageLockJson,
  }) {
    this.cwd = cwd;
    this[DATA] = packageLockJson;
    this[WORKSPACES] = null;
  }

  get data() {
    return this[DATA];
  }

  get name() {
    return this[DATA].name;
  }

  get version() {
    return this[DATA].version;
  }

  get packages() {
    return this[DATA].packages;
  }

  get pkgJSON() {
    return this[DATA].packages[''];
  }

  get dependencies() {
    return this[DATA].dependencies;
  }

  get workspaces() {
    return this[WORKSPACES];
  }

  async load() {
    await this._setWorkspaces();
  }

  async _setWorkspaces() {
    const workspaces = await mapWorkspaces({
      cwd: this.cwd,
      pkg: this.pkgJSON,
    });

    const workspacesMap = {};

    for (const [ , wsPath ] of workspaces) {
      const pkgJSON = require(path.join(wsPath, DEFAULT_PACKAGE_FILE));
      workspacesMap[pkgJSON.name] = path.relative(this.cwd, wsPath);
    }

    this[WORKSPACES] = workspacesMap;
  }

  getWorkspaceDeps() {
    const packages = this.packages;
    const workspaces = this.workspaces;
    const workspaceDeps = [];
    for (const [ name, pkg ] of Object.entries(packages)) {
      if (pkg.link === true && Object.values(workspaces).includes(pkg.resolved)) {
        workspaceDeps.push({
          source: name,
          target: pkg.resolved,
        });
      }
    }

    return workspaceDeps;
  }

  isRootPkg(pkgPath) {
    return pkgPath === '';
  }

  isWorkspacesPkg(pkgPath) {
    return Object.values(this[WORKSPACES]).includes(pkgPath);
  }

  isDepsPkg(pkgPath) {
    return !this.isRootPkg(pkgPath) && !this.isWorkspacesPkg(pkgPath);
  }
}

exports.PackageLock = PackageLock;
