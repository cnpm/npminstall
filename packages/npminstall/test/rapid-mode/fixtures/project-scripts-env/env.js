const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.join(__dirname, '1.json'), JSON.stringify(process.env, null, 2));
