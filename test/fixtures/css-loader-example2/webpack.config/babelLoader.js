
exports.devBabel = {
  test: /\.js$/,
  loader: 'babel-loader?cacheDirectory',
  exclude: /node_modules/,
  options: {
    presets: ['latest', 'stage-2', 'react'],
    plugins: [
      'transform-decorators-legacy',
      'transform-class-properties',
      ['import', { libraryName: 'antd', style: 'css' }],
    ],
  },
};

exports.prodBabel = {
  test: /\.js$/,
  loader: 'happypack/loader?id=babel',
  exclude: /node_modules/,
};
