const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    const isDevelopment = !isProduction;

    return {
        entry: {
            main: './frontend/index.tsx',
        },
        mode: argv.mode || 'development',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: isDevelopment, // Faster builds in development
                                experimentalWatchApi: true,
                            },
                        },
                    ],
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                sourceMap: isDevelopment,
                            },
                        },
                    ],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
                    type: 'asset',
                    parser: {
                        dataUrlCondition: {
                            maxSize: 8 * 1024, // 8kb - inline small images
                        },
                    },
                    generator: {
                        filename: 'images/[name].[hash:8][ext]',
                    },
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name].[hash:8][ext]',
                    },
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx'],
            alias: {
                '@': path.resolve(__dirname, 'frontend'),
                '@components': path.resolve(__dirname, 'frontend/components'),
                '@services': path.resolve(__dirname, 'frontend/services'),
                '@styles': path.resolve(__dirname, 'frontend/styles'),
            },
        },
        output: {
            filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
            chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
            publicPath: '/',
        },
        devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
        optimization: {
            minimize: isProduction,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: isProduction, // Remove console.logs in production
                            drop_debugger: true,
                            pure_funcs: ['console.log', 'console.info'],
                        },
                        mangle: {
                            safari10: true,
                        },
                        format: {
                            comments: false,
                        },
                    },
                    extractComments: false,
                }),
            ],
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10,
                    },
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                        name: 'react',
                        chunks: 'all',
                        priority: 20,
                    },
                    common: {
                        name: 'common',
                        minChunks: 2,
                        chunks: 'all',
                        priority: 5,
                        reuseExistingChunk: true,
                    },
                },
            },
            runtimeChunk: {
                name: 'runtime',
            },
            usedExports: true,
            sideEffects: false,
        },
        performance: {
            maxAssetSize: 300000, // 300kb - more strict
            maxEntrypointSize: 300000,
            hints: isProduction ? 'warning' : false,
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
            }),
            ...(isProduction
                ? [
                      new CompressionPlugin({
                          algorithm: 'gzip',
                          test: /\.(js|css|html|svg)$/,
                          threshold: 8192,
                          minRatio: 0.8,
                      }),
                  ]
                : []),
            ...(env && env.analyze ? [new BundleAnalyzerPlugin()] : []),
        ],
        cache: {
            type: 'filesystem',
            buildDependencies: {
                config: [__filename],
            },
        },
    };
};
