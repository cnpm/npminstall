const path = require('path');

console.log('process.env.npm_rootpath: %j', process.env.npm_rootpath);
console.log('hello process.env.npm_rootpath is %s', process.env.npm_rootpath === path.dirname(path.dirname(__dirname)));
