const path = require('path');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './frontend/index.tsx',
        mode: argv.mode || 'development',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    type: 'asset/resource',
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: isProduction ? 'bundle.[contenthash].js' : 'bundle.js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
        },
        devtool: isProduction ? false : 'source-map',
        optimization: {
            splitChunks: isProduction ? {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                },
            } : false,
        },
        performance: {
            maxAssetSize: 500000,
            maxEntrypointSize: 500000,
        }
    };
};
