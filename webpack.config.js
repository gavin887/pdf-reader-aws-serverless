const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './lambda.js',
    target: 'node',
    mode: 'development',
    devtool: 'source-map',
    // optimization: { minimize: true },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: [{  loader: 'babel-loader' }]
        },{
            test: /\.node$/,
            use: [{  loader: 'node-loader' }]
        }]
    },
    output: {
        libraryTarget: 'commonjs2',
        path: path.join(__dirname, '.webpack'),
        filename: 'lambda.js'
    },
    externals: ["pg", "sqlite3", "tedious", "pg-hstore"]
};
