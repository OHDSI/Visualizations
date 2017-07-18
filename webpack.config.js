const webpack = require('webpack');

const config = {
  entry: {
    main: './src/index.js'
  },
  output: {
    filename: 'index.js',
    path: __dirname,
    libraryTarget: 'amd'
  },
  externals: {
    d3: 'd3',
    numeral: 'numeral'
  },
  module: {
    loaders: [{
      test: /\.js?$/,
      exclude: /node_modules/,
      loaders: ['babel-loader'],
    }]
  },
  plugins: [],
};

config.plugins.push(new webpack.optimize.UglifyJsPlugin({
  comments: false,
}));
config.plugins.push(new webpack.optimize.OccurrenceOrderPlugin());

module.exports = config;
