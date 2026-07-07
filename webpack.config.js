const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        index: path.resolve(__dirname, 'src', 'index.ts'),
        'pdf-render-worker': path.resolve(__dirname, 'src', 'pdf-render-worker.ts'),
    },
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
                    ],
                },
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2',
        environment: { dynamicImport: true },
    },
    externals: {
        dmxnet: 'commonjs dmxnet',
        'atem-connection': 'commonjs atem-connection',
        i18next: 'i18n',
        'react-i18next': 'ReactI18next',
        'pdfjs-dist/legacy/build/pdf.mjs': 'import pdfjs-dist/legacy/build/pdf.mjs',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'src', 'bible', 'data'),
                    to: path.resolve(__dirname, 'dist', 'bible', 'data'),
                },
                {
                    from: path.resolve(
                        __dirname,
                        'node_modules',
                        'pdfjs-dist',
                        'legacy',
                        'build',
                        'pdf.worker.mjs',
                    ),
                    to: path.resolve(__dirname, 'dist', 'pdf.worker.mjs'),
                },
                {
                    from: path.resolve(
                        __dirname,
                        'node_modules',
                        'pdfjs-dist',
                        'standard_fonts',
                    ),
                    to: path.resolve(__dirname, 'dist', 'standard_fonts'),
                },
            ],
        }),
    ],
    mode: 'production',
    target: 'node',
};
