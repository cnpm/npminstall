const path = require('path');
const webpack = require('webpack');

const { devBabel } = require('./babelLoader');

module.exports = require('./webpack.config.base')({
  devtool: 'cheap-module-eval-source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.join(process.cwd(), 'app/public/local'),
    publicPath: '/public/local/',
    chunkFilename: '[name].bundle.js',
  },
  module: {
    rules: [
      devBabel,
    ],
  },
  plugins: [
    new webpack.DllReferencePlugin({
      context: path.join(process.cwd(), 'app/public/local'),
      manifest: require('./commons-manifest.json'), // eslint-disable-line
    }),
  ],
});
