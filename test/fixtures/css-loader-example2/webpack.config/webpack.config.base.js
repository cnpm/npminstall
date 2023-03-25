const path = require('node:path');
const postcssNested = require('postcss-nested');
const autoprefixer = require('autoprefixer');

module.exports = function (options) { // eslint-disable-line
  return {
    output: options.output,
    devtool: options.devtool,
    entry: Object.assign({}, options.entry || {}, {
      app: path.join(process.cwd(), 'client/index.js'),
    }),
    module: {
      rules: options.module.rules.concat([
        {
          test: /\.css/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => {
                  return [
                    postcssNested,
                    autoprefixer,
                  ];
                },
              },
            },
          ],
        }, {
          test: /\.less/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: true,
              },
            },
            'less-loader',
          ],
        }, {
          test: /\.png/,
          loader: 'url-loader',
        }, {
          test: /\.(otf|eot|svg|ttf|woff|woff2)(\?.+)?$/,
          loader: 'url-loader',
        },
      ]),
      noParse: [/jszip.js$/],
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        $components: path.resolve(__dirname, '../client/components'),
        $common: path.resolve(__dirname, '../client/components/common'),
        $stores: path.resolve(__dirname, '../client/stores'),
        $i18n: path.resolve(__dirname, '../client/i18n'),
        $utils: path.resolve(__dirname, '../client/utils'),
      },
    },
    plugins: options.plugins,
    node: {
      fs: 'empty',
    },
    externals: [
      { './cptable': 'var cptable' },
    ],
  };
};
