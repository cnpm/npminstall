const { join } = require('node:path');
const os = require('node:os');
const webpack = require('webpack');
const AssetsPlugin = require('assets-webpack-plugin');
const HappyPack = require('happypack');
const ParallelUglifyPlugin = require('webpack-parallel-uglify-plugin');
const WebpackChunkHash = require('webpack-chunk-hash');

const { prodBabel } = require('./babelLoader');

const happyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length });

const babelOptions = {
  presets: ['latest', 'stage-2', 'react'],
  plugins: [
    'transform-decorators-legacy',
    'transform-class-properties',
    ['import', { libraryName: 'antd', style: 'css' }],
  ],
};

module.exports = require('./webpack.config.base')({
  entry: {
    commons: [
      'react',
      'react-dom',
      'react-router',
      'i18next',
      'i18next-xhr-backend',
      'decko',
      'moment',
      'mobx',
      'antd',
    ],
  },
  output: {
    filename: '[name].bundle.[id][chunkhash].js',
    path: join(process.cwd(), 'build/app/public/prod'),
    publicPath: '/public/prod/',
    chunkFilename: '[name].bundle.[id][chunkhash].js',
  },
  module: {
    rules: [
      prodBabel,
    ],
  },
  plugins: [
    new HappyPack({
      id: 'babel',
      loaders: [`babel-loader?${JSON.stringify(babelOptions)}`],
      threadPool: happyThreadPool,
      cache: false,
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'commons',
    }),
    new webpack.HashedModuleIdsPlugin(),
    new WebpackChunkHash(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new ParallelUglifyPlugin({
      uglifyJS: {
        compress: {
          warnings: false,
        },
        sourceMap: false,
        mangle: false,
      },
    }),
    new AssetsPlugin(),
  ],
});
