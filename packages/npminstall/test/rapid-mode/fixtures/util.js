'use strict';

const fs = require('mz/fs');
const path = require('path');


class TestUtil {
  static async readFixtureJson(fixtureDir, name) {
    return JSON.parse(await fs.readFile(path.join(__dirname, fixtureDir, name), 'utf8'));
  }
}

module.exports = TestUtil;
