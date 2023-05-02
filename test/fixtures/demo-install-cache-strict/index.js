'use strict';

console.log(
  require.resolve('koa'),
  !!require('koa'),
  require.resolve('@rstacruz/tap-spec'),
  !!require('@rstacruz/tap-spec')
);
