'use strict';

const nock = require('nock');
const fs = require('fs');
const path = require('path');
const tgzFile = path.join(__dirname, './ci-4.37.1.tgz');

nock('https://registry.npmmirror.com', { allowUnmocked: true })
  .persist() // nock all get requests
  .get(/.*/)
  .reply(200, Buffer.from(fs.readFileSync(tgzFile), 'utf-8'));

nock('https://cdn.npmmirror.com/packages', { allowUnmocked: true })
  .persist() // nock all get requests
  .get(/.*/)
  .reply(200, Buffer.from(fs.readFileSync(tgzFile), 'utf-8'));

