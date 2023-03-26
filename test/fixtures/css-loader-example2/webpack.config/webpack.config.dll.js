const { join } = require('node:path');
const webpack = require('webpack');

module.exports = {
  context: process.cwd(),
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
  devtool: 'eval',
  output: {
    filename: '[name].bundle.js',
    path: join(process.cwd(), 'app/public/local/'),
    library: '[name]_lib',
  },
  plugins: [
    new webpack.DllPlugin({
      context: join(process.cwd(), 'app/public/local'),
      name: '[name]_lib',
      path: join(process.cwd(), 'webpack.config/[name]-manifest.json') }),
  ],
};
