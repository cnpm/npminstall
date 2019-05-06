#!/usr/bin/env sh

echo 'test install on https://github.com/ant-design/ant-design.git'
rm -rf ant-design
git clone https://github.com/ant-design/ant-design.git --depth 1
cd ant-design
node ../bin/install.js || exit $?
cd ..
rm -rf ant-design

# echo '-------------------------------------------------------'
# echo 'test install on https://github.com/ant-design/ant-design-mobile.git'
# rm -rf ant-design-mobile
# git clone https://github.com/ant-design/ant-design-mobile.git --depth 1
# cd ant-design-mobile
# node ../bin/install.js || exit $?
# cd ..
# rm -rf ant-design-mobile
#
# echo '-------------------------------------------------------'
# rm -rf node-sqlite3
# echo 'test install on https://github.com/mapbox/node-sqlite3.git'
# git clone https://github.com/mapbox/node-sqlite3.git --depth 1
# cd node-sqlite3
# node ../bin/install.js || exit $?
# cd ..
# rm -rf node-sqlite3
