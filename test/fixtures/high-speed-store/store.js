'use strict';

const path = require('path');
const fs = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const utility = require('utility');
const urllib = require('urllib');

exports.getStream = async url => {
  const dir = path.join(__dirname, 'tmp');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, utility.md5(url) + path.extname(url));
  try {
    await fs.access(file);
    return createReadStream(file);
  } catch {
    // ignore here
  }

  await urllib.request(url, {
    writeStream: createWriteStream(file),
    timeout: 10000,
    followRedirect: true,
  });
  return createReadStream(file);
};
