const path = require('path');

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
        extensions: ['.ts', '.tsx'],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2'
    },
    externals: {
        'dmxnet': 'commonjs dmxnet',
        'atem-connection': 'commonjs atem-connection',
    },
    mode: 'production',
    target: 'node',
};
