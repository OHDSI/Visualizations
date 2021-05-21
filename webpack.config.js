const webpack = require('webpack');
const TerserPlugin = require("terser-webpack-plugin");

const config = {
  mode: 'production',
  entry: {
    main: './atlascharts/main.js'
  },
  output: {
    filename: 'dist/atlascharts.umd.js',
    path: __dirname,
    libraryTarget: 'umd',
		library: 'atlascharts'
  },
  externals: {
    d3: 'd3',
    numeral: 'numeral',
    lodash: {
      commonjs: 'lodash',
      commonjs2: 'lodash',
      amd: 'lodash',
      root: '_', // indicates global variable
    }
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        format: {
          comments: false,
        },
      },
      extractComments: false,
    })],
  }
};

module.exports = config;
