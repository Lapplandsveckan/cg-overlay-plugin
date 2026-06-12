const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, 'src', 'index.ts'),
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/, /src\/ui/],

                loader: 'babel-loader',
                options: {
                    presets: [
                        '@babel/preset-typescript',
                        '@babel/preset-react',
                        '@babel/preset-env',
                    ]
                }
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2'
    },
    externals: {
        'dmxnet': 'commonjs dmxnet',
        'atem-connection': 'commonjs atem-connection',
        'i18next': 'i18n',
        'react-i18next': 'ReactI18next',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'src', 'bible', 'data'),
                    to: path.resolve(__dirname, 'dist', 'bible', 'data'),
                },
            ],
        }),
    ],
    mode: 'production',
    target: 'node',
};
