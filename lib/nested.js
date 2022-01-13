'use strict';


class Nested {
  constructor(pkgs, parent) {
    this.depMap = new Map();
    this.update(pkgs, parent);
  }

  update(pkgs, parent) {
    pkgs.forEach(pkg => {
      this.depMap.set(pkg, parent || 'root');
    });
  }

  showPath(raw) {
    const raws = [ raw ];
    let currentRaw = raw;

    while (this.depMap.has(currentRaw)) {
      const parent = this.depMap.get(currentRaw);

      // cycle nested deps
      if (raws.includes(parent)) {
        break;
      }

      raws.unshift(parent);
      currentRaw = parent;
    }

    return raws.join(' › ');
  }
}

module.exports = Nested;
