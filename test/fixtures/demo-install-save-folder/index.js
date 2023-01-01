'use strict';

console.log(
  require.resolve('express'),
  !!require('express'),
  require.resolve('koa'),
  !!require('koa'),
  require.resolve('@rstacruz/tap-spec'),
  !!require('@rstacruz/tap-spec')
);
