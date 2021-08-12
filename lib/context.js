'use strict';

const Nested = require('./nested');

class Context {
  constructor() {
    this.nested = new Nested([]);
  }
}

module.exports = Context;
