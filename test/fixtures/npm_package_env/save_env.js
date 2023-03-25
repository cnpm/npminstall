'use strict';

const fs = require('node:fs');
const path = require('node:path');

fs.writeFileSync(path.join(__dirname, `.tmp_${process.argv[2]}`), JSON.stringify(process.env, null, 2));
