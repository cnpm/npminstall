'use strict';

const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.join(__dirname, `.tmp_${process.argv[2]}`), JSON.stringify(process.env, null, 2));
