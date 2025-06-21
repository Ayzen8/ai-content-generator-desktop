const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

class CDNOptimizationService {
    constructor() {
        this.assetsDir = path.join(__dirname, '..', 'dist');
        this.optimizedAssetsDir = path.join(__dirname, '..', 'dist', 'optimized');
        this.assetManifest = new Map();
        this.compressionFormats = ['gzip', 'brotli'];
        this.imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
        this.initializeOptimization();
    }

    // Initialize optimization process
    async initializeOptimization() {
        try {
            await this.ensureDirectories();
            await this.generateAssetManifest();
            await this.optimizeAssets();
            console.log('✅ CDN optimization service initialized');
        } catch (error) {
            console.error('CDN optimization initialization error:', error);
        }
    }

    // Ensure required directories exist
    async ensureDirectories() {
        try {
            await fs.mkdir(this.optimizedAssetsDir, { recursive: true });
            await fs.mkdir(path.join(this.optimizedAssetsDir, 'images'), { recursive: true });
            await fs.mkdir(path.join(this.optimizedAssetsDir, 'js'), { recursive: true });
            await fs.mkdir(path.join(this.optimizedAssetsDir, 'css'), { recursive: true });
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }

    // Generate asset manifest with hashes
    async generateAssetManifest() {
        try {
            const files = await this.getAllFiles(this.assetsDir);
            
            for (const file of files) {
                const relativePath = path.relative(this.assetsDir, file);
                const stats = await fs.stat(file);
                const content = await fs.readFile(file);
                const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
                
                this.assetManifest.set(relativePath, {
                    originalPath: file,
                    hash,
                    size: stats.size,
                    lastModified: stats.mtime,
                    contentType: this.getContentType(file),
                    optimized: false,
                    compressions: {}
                });
            }
            
            console.log(`📦 Generated manifest for ${this.assetManifest.size} assets`);
        } catch (error) {
            console.error('Error generating asset manifest:', error);
        }
    }

    // Get all files recursively
    async getAllFiles(dir) {
        const files = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && entry.name !== 'optimized') {
                    files.push(...await this.getAllFiles(fullPath));
                } else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory might not exist yet
        }
        
        return files;
    }

    // Get content type based on file extension
    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        };
        
        return contentTypes[ext] || 'application/octet-stream';
    }

    // Optimize all assets
    async optimizeAssets() {
        const optimizationPromises = [];
        
        for (const [relativePath, assetInfo] of this.assetManifest.entries()) {
            if (!assetInfo.optimized) {
                optimizationPromises.push(this.optimizeAsset(relativePath, assetInfo));
            }
        }
        
        await Promise.all(optimizationPromises);
        console.log(`🚀 Optimized ${optimizationPromises.length} assets`);
    }

    // Optimize individual asset
    async optimizeAsset(relativePath, assetInfo) {
        try {
            const content = await fs.readFile(assetInfo.originalPath);
            const ext = path.extname(relativePath).toLowerCase();
            
            // Compress text-based assets
            if (['.js', '.css', '.html', '.json', '.svg'].includes(ext)) {
                await this.compressAsset(relativePath, content, assetInfo);
            }
            
            // Optimize images
            if (this.imageFormats.includes(ext)) {
                await this.optimizeImage(relativePath, content, assetInfo);
            }
            
            assetInfo.optimized = true;
        } catch (error) {
            console.error(`Error optimizing asset ${relativePath}:`, error);
        }
    }

    // Compress asset with multiple formats
    async compressAsset(relativePath, content, assetInfo) {
        const optimizedPath = path.join(this.optimizedAssetsDir, relativePath);
        await fs.mkdir(path.dirname(optimizedPath), { recursive: true });
        
        // Original file
        await fs.writeFile(optimizedPath, content);
        
        // Gzip compression
        const gzipContent = await this.gzipCompress(content);
        await fs.writeFile(`${optimizedPath}.gz`, gzipContent);
        assetInfo.compressions.gzip = {
            size: gzipContent.length,
            ratio: (gzipContent.length / content.length * 100).toFixed(2)
        };
        
        // Brotli compression
        try {
            const brotliContent = await this.brotliCompress(content);
            await fs.writeFile(`${optimizedPath}.br`, brotliContent);
            assetInfo.compressions.brotli = {
                size: brotliContent.length,
                ratio: (brotliContent.length / content.length * 100).toFixed(2)
            };
        } catch (error) {
            console.warn(`Brotli compression failed for ${relativePath}:`, error.message);
        }
    }

    // Gzip compression
    async gzipCompress(content) {
        return new Promise((resolve, reject) => {
            zlib.gzip(content, { level: 9 }, (err, compressed) => {
                if (err) reject(err);
                else resolve(compressed);
            });
        });
    }

    // Brotli compression
    async brotliCompress(content) {
        return new Promise((resolve, reject) => {
            zlib.brotliCompress(content, {
                params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length
                }
            }, (err, compressed) => {
                if (err) reject(err);
                else resolve(compressed);
            });
        });
    }

    // Basic image optimization (placeholder for advanced image processing)
    async optimizeImage(relativePath, content, assetInfo) {
        const optimizedPath = path.join(this.optimizedAssetsDir, relativePath);
        await fs.mkdir(path.dirname(optimizedPath), { recursive: true });
        
        // For now, just copy the image
        // In production, you'd use libraries like sharp, imagemin, etc.
        await fs.writeFile(optimizedPath, content);
        
        // Add WebP conversion for supported formats
        const ext = path.extname(relativePath).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            // Placeholder for WebP conversion
            assetInfo.webpAvailable = true;
        }
    }

    // Get optimized asset path
    getOptimizedAssetPath(originalPath, acceptEncoding = '') {
        const assetInfo = this.assetManifest.get(originalPath);
        if (!assetInfo) return null;
        
        const optimizedPath = path.join(this.optimizedAssetsDir, originalPath);
        
        // Return compressed version if supported
        if (acceptEncoding.includes('br') && assetInfo.compressions.brotli) {
            return `${optimizedPath}.br`;
        } else if (acceptEncoding.includes('gzip') && assetInfo.compressions.gzip) {
            return `${optimizedPath}.gz`;
        }
        
        return optimizedPath;
    }

    // Get asset headers for optimal caching
    getAssetHeaders(originalPath, acceptEncoding = '') {
        const assetInfo = this.assetManifest.get(originalPath);
        if (!assetInfo) return {};
        
        const headers = {
            'Content-Type': assetInfo.contentType,
            'Cache-Control': this.getCacheControl(originalPath),
            'ETag': `"${assetInfo.hash}"`,
            'Last-Modified': assetInfo.lastModified.toUTCString()
        };
        
        // Add compression headers
        if (acceptEncoding.includes('br') && assetInfo.compressions.brotli) {
            headers['Content-Encoding'] = 'br';
            headers['Content-Length'] = assetInfo.compressions.brotli.size;
        } else if (acceptEncoding.includes('gzip') && assetInfo.compressions.gzip) {
            headers['Content-Encoding'] = 'gzip';
            headers['Content-Length'] = assetInfo.compressions.gzip.size;
        } else {
            headers['Content-Length'] = assetInfo.size;
        }
        
        // Add security headers
        headers['X-Content-Type-Options'] = 'nosniff';
        
        return headers;
    }

    // Get cache control based on asset type
    getCacheControl(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const hasHash = /\.[a-f0-9]{8}\./i.test(filePath);
        
        if (hasHash) {
            // Hashed assets can be cached for a year
            return 'public, max-age=31536000, immutable';
        } else if (['.js', '.css'].includes(ext)) {
            // Non-hashed JS/CSS files
            return 'public, max-age=86400'; // 1 day
        } else if (this.imageFormats.includes(ext)) {
            // Images
            return 'public, max-age=604800'; // 1 week
        } else if (['.html'].includes(ext)) {
            // HTML files
            return 'public, max-age=300'; // 5 minutes
        }
        
        return 'public, max-age=3600'; // 1 hour default
    }

    // Generate optimization report
    getOptimizationReport() {
        const report = {
            totalAssets: this.assetManifest.size,
            optimizedAssets: 0,
            totalOriginalSize: 0,
            totalOptimizedSize: 0,
            compressionSavings: {
                gzip: { assets: 0, originalSize: 0, compressedSize: 0 },
                brotli: { assets: 0, originalSize: 0, compressedSize: 0 }
            },
            assetTypes: {}
        };
        
        for (const [relativePath, assetInfo] of this.assetManifest.entries()) {
            const ext = path.extname(relativePath).toLowerCase();
            
            if (!report.assetTypes[ext]) {
                report.assetTypes[ext] = { count: 0, size: 0 };
            }
            
            report.assetTypes[ext].count++;
            report.assetTypes[ext].size += assetInfo.size;
            report.totalOriginalSize += assetInfo.size;
            
            if (assetInfo.optimized) {
                report.optimizedAssets++;
            }
            
            if (assetInfo.compressions.gzip) {
                report.compressionSavings.gzip.assets++;
                report.compressionSavings.gzip.originalSize += assetInfo.size;
                report.compressionSavings.gzip.compressedSize += assetInfo.compressions.gzip.size;
            }
            
            if (assetInfo.compressions.brotli) {
                report.compressionSavings.brotli.assets++;
                report.compressionSavings.brotli.originalSize += assetInfo.size;
                report.compressionSavings.brotli.compressedSize += assetInfo.compressions.brotli.size;
            }
        }
        
        // Calculate savings percentages
        if (report.compressionSavings.gzip.originalSize > 0) {
            report.compressionSavings.gzip.savingsPercent = 
                ((report.compressionSavings.gzip.originalSize - report.compressionSavings.gzip.compressedSize) / 
                 report.compressionSavings.gzip.originalSize * 100).toFixed(2);
        }
        
        if (report.compressionSavings.brotli.originalSize > 0) {
            report.compressionSavings.brotli.savingsPercent = 
                ((report.compressionSavings.brotli.originalSize - report.compressionSavings.brotli.compressedSize) / 
                 report.compressionSavings.brotli.originalSize * 100).toFixed(2);
        }
        
        return report;
    }

    // Middleware for serving optimized assets
    createAssetMiddleware() {
        return (req, res, next) => {
            const requestPath = req.path.startsWith('/') ? req.path.substring(1) : req.path;
            const assetInfo = this.assetManifest.get(requestPath);
            
            if (!assetInfo) {
                return next();
            }
            
            const acceptEncoding = req.headers['accept-encoding'] || '';
            const optimizedPath = this.getOptimizedAssetPath(requestPath, acceptEncoding);
            const headers = this.getAssetHeaders(requestPath, acceptEncoding);
            
            // Check if client has cached version
            const clientETag = req.headers['if-none-match'];
            if (clientETag === headers['ETag']) {
                return res.status(304).end();
            }
            
            // Set headers and serve file
            Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
            
            res.sendFile(optimizedPath);
        };
    }
}

module.exports = new CDNOptimizationService();
