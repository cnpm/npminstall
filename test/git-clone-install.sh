#!/usr/bin/env sh

git clone https://github.com/ant-design/ant-design.git
cd ant-design
node ../bin/install.js
# npmupdate
node ../bin/update.js
cd ..

git clone https://github.com/ant-design/ant-design-mobile.git
cd ant-design-mobile
node ../bin/install.js
cd ..

git clone https://github.com/mapbox/node-sqlite3.git
cd node-sqlite3
node ../bin/install.js
cd ..
