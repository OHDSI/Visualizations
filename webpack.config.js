const webpack = require('webpack');

const config = {
  entry: {
    main: './atlascharts/main.js'
  },
  output: {
    filename: 'dist/atlascharts.umd.js',
    path: __dirname,
    libraryTarget: 'umd'
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
