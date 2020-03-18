const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/app.js',
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.js'
    },
    devServer: {
        contentBase: './dist'
    },
    plugins: [
        new CopyPlugin([
            { from: 'src/index.html', to: './' },
            { from: 'src/style.css', to: './' },
        ]),
    ],
};