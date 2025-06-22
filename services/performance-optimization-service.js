const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const advancedCachingService = require('./advanced-caching-service');
const cdnOptimizationService = require('./cdn-optimization-service');

class PerformanceOptimizationService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
        this.initializePerformanceTables();
    }

    // Initialize performance tracking tables
    initializePerformanceTables() {
        const createPerformanceTables = `
            CREATE TABLE IF NOT EXISTS api_response_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT UNIQUE NOT NULL,
                response_data TEXT NOT NULL,
                content_type TEXT DEFAULT 'json',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                hit_count INTEGER DEFAULT 0,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS performance_metrics_optimization (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL, -- 'api_response', 'db_query', 'cache_hit', 'memory_usage'
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                unit TEXT, -- 'ms', 'mb', 'count', 'percentage'
                tags TEXT, -- JSON with additional context (renamed from context)
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS optimization_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                suggestion_type TEXT NOT NULL, -- 'cache', 'query', 'index', 'memory'
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                impact_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
                implementation_effort TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
                expected_improvement TEXT,
                code_example TEXT,
                status TEXT DEFAULT 'pending', -- 'pending', 'implemented', 'dismissed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                implemented_at DATETIME
            );
        `;

        this.db.exec(createPerformanceTables, (err) => {
            if (err) {
                console.error('Error creating performance tables:', err);
            } else {
                console.log('✅ Performance optimization tables initialized');
                this.startPerformanceMonitoring();
            }
        });
    }

    // Start performance monitoring
    startPerformanceMonitoring() {
        // Monitor memory usage every 30 seconds
        setInterval(() => {
            this.recordMemoryUsage();
        }, 30000);

        // Clean expired cache entries every 5 minutes
        setInterval(() => {
            this.cleanExpiredCache();
        }, 5 * 60 * 1000);

        // Generate optimization suggestions every hour
        setInterval(() => {
            this.generateOptimizationSuggestions();
        }, 60 * 60 * 1000);
    }

    // Record memory usage
    async recordMemoryUsage() {
        try {
            const memUsage = process.memoryUsage();
            
            await this.recordMetric('memory_usage', 'heap_used', memUsage.heapUsed / 1024 / 1024, 'mb');
            await this.recordMetric('memory_usage', 'heap_total', memUsage.heapTotal / 1024 / 1024, 'mb');
            await this.recordMetric('memory_usage', 'external', memUsage.external / 1024 / 1024, 'mb');
            await this.recordMetric('memory_usage', 'rss', memUsage.rss / 1024 / 1024, 'mb');

            // Check for memory leaks
            if (memUsage.heapUsed / 1024 / 1024 > 200) { // 200MB threshold
                await this.createOptimizationSuggestion(
                    'memory',
                    'High Memory Usage Detected',
                    `Memory usage is ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB. Consider implementing memory optimization strategies.`,
                    'high',
                    'medium',
                    'Reduce memory usage by 20-30%',
                    'Implement object pooling, clear unused references, optimize data structures'
                );
            }
        } catch (error) {
            console.error('Error recording memory usage:', error);
        }
    }

    // Record performance metric
    async recordMetric(type, name, value, unit = null, context = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO performance_metrics_optimization (metric_type, metric_name, metric_value, unit, tags)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(query, [type, name, value, unit, JSON.stringify(context)], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Cache management
    async setCache(key, data, ttl = this.defaultCacheTTL) {
        try {
            const expiresAt = new Date(Date.now() + ttl);
            
            // Store in memory cache
            this.cache.set(key, data);
            this.cacheExpiry.set(key, expiresAt.getTime());

            // Store in database cache for persistence
            await this.setCacheInDB(key, data, expiresAt);
            
            await this.recordMetric('cache', 'cache_set', 1, 'count', { key, ttl });
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    }

    // Get from cache
    async getCache(key) {
        try {
            // Check memory cache first
            if (this.cache.has(key)) {
                const expiry = this.cacheExpiry.get(key);
                if (expiry && Date.now() < expiry) {
                    await this.recordMetric('cache', 'cache_hit_memory', 1, 'count', { key });
                    return this.cache.get(key);
                } else {
                    // Expired, remove from memory
                    this.cache.delete(key);
                    this.cacheExpiry.delete(key);
                }
            }

            // Check database cache
            const dbData = await this.getCacheFromDB(key);
            if (dbData) {
                // Restore to memory cache
                this.cache.set(key, dbData);
                this.cacheExpiry.set(key, Date.now() + this.defaultCacheTTL);
                
                await this.recordMetric('cache', 'cache_hit_db', 1, 'count', { key });
                return dbData;
            }

            await this.recordMetric('cache', 'cache_miss', 1, 'count', { key });
            return null;
        } catch (error) {
            console.error('Error getting cache:', error);
            return null;
        }
    }

    // Set cache in database
    async setCacheInDB(key, data, expiresAt) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO api_response_cache 
                (cache_key, response_data, expires_at, hit_count, last_accessed)
                VALUES (?, ?, ?, COALESCE((SELECT hit_count FROM api_response_cache WHERE cache_key = ?), 0), CURRENT_TIMESTAMP)
            `;

            this.db.run(query, [key, JSON.stringify(data), expiresAt.toISOString(), key], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get cache from database
    async getCacheFromDB(key) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT response_data, expires_at FROM api_response_cache 
                WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
            `;

            this.db.get(query, [key], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    // Update hit count and last accessed
                    this.updateCacheHitCount(key);
                    try {
                        resolve(JSON.parse(row.response_data));
                    } catch (parseError) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
    }

    // Update cache hit count
    async updateCacheHitCount(key) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE api_response_cache 
                SET hit_count = hit_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE cache_key = ?
            `;

            this.db.run(query, [key], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Clean expired cache entries
    async cleanExpiredCache() {
        try {
            // Clean memory cache
            const now = Date.now();
            for (const [key, expiry] of this.cacheExpiry.entries()) {
                if (now >= expiry) {
                    this.cache.delete(key);
                    this.cacheExpiry.delete(key);
                }
            }

            // Clean database cache
            await new Promise((resolve, reject) => {
                const query = `DELETE FROM api_response_cache WHERE expires_at <= CURRENT_TIMESTAMP`;
                
                this.db.run(query, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        if (this.changes > 0) {
                            console.log(`🧹 Cleaned ${this.changes} expired cache entries`);
                        }
                        resolve(this.changes);
                    }
                });
            });

            await this.recordMetric('cache', 'cache_cleanup', 1, 'count');
        } catch (error) {
            console.error('Error cleaning expired cache:', error);
        }
    }

    // Optimize database queries with caching wrapper
    async optimizedQuery(query, params = [], cacheKey = null, cacheTTL = this.defaultCacheTTL) {
        const startTime = Date.now();
        
        try {
            // Try cache first if cache key provided
            if (cacheKey) {
                const cachedResult = await this.getCache(cacheKey);
                if (cachedResult) {
                    const responseTime = Date.now() - startTime;
                    await this.recordMetric('db_query', 'cached_query_time', responseTime, 'ms', { query: query.substring(0, 100) });
                    return cachedResult;
                }
            }

            // Execute query
            const result = await new Promise((resolve, reject) => {
                this.db.all(query, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            const responseTime = Date.now() - startTime;
            await this.recordMetric('db_query', 'query_time', responseTime, 'ms', { query: query.substring(0, 100) });

            // Cache result if cache key provided
            if (cacheKey && result) {
                await this.setCache(cacheKey, result, cacheTTL);
            }

            // Check for slow queries
            if (responseTime > 100) {
                await this.createOptimizationSuggestion(
                    'query',
                    'Slow Database Query Detected',
                    `Query took ${responseTime}ms to execute. Consider optimization.`,
                    'medium',
                    'low',
                    'Reduce query time by 50-70%',
                    `Query: ${query.substring(0, 200)}...`
                );
            }

            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            await this.recordMetric('db_query', 'query_error', responseTime, 'ms', { 
                query: query.substring(0, 100),
                error: error.message 
            });
            throw error;
        }
    }

    // API response caching wrapper with advanced caching
    async cachedApiCall(apiFunction, cacheKey, options = {}) {
        const startTime = Date.now();
        const {
            cacheTTL = this.defaultCacheTTL,
            tags = [],
            priority = 1,
            compression = 'gzip',
            namespace = 'api'
        } = options;

        try {
            // Try advanced cache first
            const cachedResult = await advancedCachingService.get(cacheKey, namespace);
            if (cachedResult) {
                const responseTime = Date.now() - startTime;
                await this.recordMetric('api_response', 'cached_api_time', responseTime, 'ms', { cacheKey });
                return cachedResult;
            }

            // Execute API call
            const result = await apiFunction();
            const responseTime = Date.now() - startTime;

            await this.recordMetric('api_response', 'api_time', responseTime, 'ms', { cacheKey });

            // Cache successful result with advanced options
            if (result) {
                await advancedCachingService.set(cacheKey, result, {
                    ttl: cacheTTL / 1000, // Convert to seconds
                    tags,
                    priority,
                    compression,
                    namespace
                });
            }

            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            await this.recordMetric('api_response', 'api_error', responseTime, 'ms', {
                cacheKey,
                error: error.message
            });
            throw error;
        }
    }

    // Advanced cache invalidation
    async invalidateCache(tags) {
        try {
            const invalidatedCount = await advancedCachingService.invalidateByTags(tags);
            await this.recordMetric('cache', 'cache_invalidation', invalidatedCount, 'count', { tags });
            return invalidatedCount;
        } catch (error) {
            console.error('Cache invalidation error:', error);
            return 0;
        }
    }

    // Get advanced cache statistics
    async getAdvancedCacheStats() {
        return advancedCachingService.getCacheStats();
    }

    // Get CDN optimization report
    async getCDNOptimizationReport() {
        return cdnOptimizationService.getOptimizationReport();
    }

    // Generate optimization suggestions
    async generateOptimizationSuggestions() {
        try {
            // Analyze recent performance metrics
            const recentMetrics = await this.getRecentMetrics();
            
            // Check for patterns and generate suggestions
            await this.analyzeQueryPerformance(recentMetrics);
            await this.analyzeCacheEfficiency(recentMetrics);
            await this.analyzeMemoryUsage(recentMetrics);
            
        } catch (error) {
            console.error('Error generating optimization suggestions:', error);
        }
    }

    // Get recent performance metrics
    async getRecentMetrics() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM performance_metrics_optimization
                WHERE recorded_at >= datetime('now', '-1 hour')
                ORDER BY recorded_at DESC
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Analyze query performance
    async analyzeQueryPerformance(metrics) {
        const queryMetrics = metrics.filter(m => m.metric_type === 'db_query' && m.metric_name === 'query_time');
        
        if (queryMetrics.length > 0) {
            const avgQueryTime = queryMetrics.reduce((sum, m) => sum + m.value, 0) / queryMetrics.length;
            const slowQueries = queryMetrics.filter(m => m.value > 100);
            
            if (avgQueryTime > 50) {
                await this.createOptimizationSuggestion(
                    'query',
                    'Overall Query Performance Degradation',
                    `Average query time is ${avgQueryTime.toFixed(2)}ms. Consider database optimization.`,
                    'medium',
                    'medium',
                    'Improve average query time by 30-50%',
                    'Add indexes, optimize WHERE clauses, consider query restructuring'
                );
            }

            if (slowQueries.length > queryMetrics.length * 0.2) {
                await this.createOptimizationSuggestion(
                    'index',
                    'Multiple Slow Queries Detected',
                    `${slowQueries.length} slow queries detected. Database indexing may help.`,
                    'high',
                    'low',
                    'Reduce slow query count by 70-80%',
                    'CREATE INDEX idx_name ON table_name (column_name);'
                );
            }
        }
    }

    // Analyze cache efficiency
    async analyzeCacheEfficiency(metrics) {
        const cacheHits = metrics.filter(m => m.metric_type === 'cache' && m.metric_name.includes('cache_hit')).length;
        const cacheMisses = metrics.filter(m => m.metric_type === 'cache' && m.metric_name === 'cache_miss').length;
        
        if (cacheHits + cacheMisses > 0) {
            const hitRate = cacheHits / (cacheHits + cacheMisses);
            
            if (hitRate < 0.6) {
                await this.createOptimizationSuggestion(
                    'cache',
                    'Low Cache Hit Rate',
                    `Cache hit rate is ${(hitRate * 100).toFixed(1)}%. Consider increasing cache TTL or improving cache strategy.`,
                    'medium',
                    'low',
                    'Increase cache hit rate to 80%+',
                    'Increase cache TTL, implement smarter cache invalidation, cache more frequently accessed data'
                );
            }
        }
    }

    // Analyze memory usage
    async analyzeMemoryUsage(metrics) {
        const memoryMetrics = metrics.filter(m => m.metric_type === 'memory_usage' && m.metric_name === 'heap_used');
        
        if (memoryMetrics.length > 0) {
            const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
            const maxMemory = Math.max(...memoryMetrics.map(m => m.value));
            
            if (maxMemory > 150) {
                await this.createOptimizationSuggestion(
                    'memory',
                    'High Memory Usage Peak',
                    `Peak memory usage reached ${maxMemory.toFixed(2)}MB. Consider memory optimization.`,
                    'medium',
                    'medium',
                    'Reduce peak memory usage by 20-30%',
                    'Implement object pooling, optimize data structures, clear unused references'
                );
            }

            // Check for memory growth trend
            if (memoryMetrics.length >= 5) {
                const recent = memoryMetrics.slice(0, 5);
                const older = memoryMetrics.slice(-5);
                const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
                const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;
                
                if (recentAvg > olderAvg * 1.2) {
                    await this.createOptimizationSuggestion(
                        'memory',
                        'Memory Usage Growth Trend',
                        `Memory usage increased by ${((recentAvg / olderAvg - 1) * 100).toFixed(1)}% recently. Possible memory leak.`,
                        'high',
                        'high',
                        'Stop memory growth and reduce usage',
                        'Investigate memory leaks, implement proper cleanup, monitor object references'
                    );
                }
            }
        }
    }

    // Create optimization suggestion
    async createOptimizationSuggestion(type, title, description, impact, effort, improvement, codeExample) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO optimization_suggestions 
                (suggestion_type, title, description, impact_level, implementation_effort, expected_improvement, code_example)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [type, title, description, impact, effort, improvement, codeExample], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get performance dashboard data
    async getPerformanceDashboard() {
        try {
            const [
                recentMetrics,
                cacheStats,
                advancedCacheStats,
                cdnReport,
                optimizationSuggestions,
                systemStats
            ] = await Promise.all([
                this.getRecentMetrics(),
                this.getCacheStatistics(),
                this.getAdvancedCacheStats(),
                this.getCDNOptimizationReport(),
                this.getOptimizationSuggestions(),
                this.getSystemStatistics()
            ]);

            return {
                recent_metrics: recentMetrics,
                cache_statistics: cacheStats,
                advanced_cache_statistics: advancedCacheStats,
                cdn_optimization_report: cdnReport,
                optimization_suggestions: optimizationSuggestions,
                system_statistics: systemStats,
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting performance dashboard:', error);
            throw error;
        }
    }

    // Get cache statistics
    async getCacheStatistics() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total_entries,
                    SUM(hit_count) as total_hits,
                    AVG(hit_count) as avg_hits_per_entry,
                    COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_entries,
                    COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_entries
                FROM api_response_cache
            `;

            this.db.get(query, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        ...row,
                        memory_cache_size: this.cache.size,
                        memory_cache_entries: Array.from(this.cache.keys()).length
                    });
                }
            });
        });
    }

    // Get optimization suggestions
    async getOptimizationSuggestions() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM optimization_suggestions 
                WHERE status = 'pending'
                ORDER BY 
                    CASE impact_level 
                        WHEN 'critical' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        WHEN 'low' THEN 4 
                    END,
                    created_at DESC
                LIMIT 10
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get system statistics
    async getSystemStatistics() {
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        return {
            memory_usage: {
                heap_used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
                heap_total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
                external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
                rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
            },
            uptime_seconds: Math.round(uptime),
            uptime_formatted: this.formatUptime(uptime),
            node_version: process.version,
            platform: process.platform,
            cpu_usage: process.cpuUsage()
        };
    }

    // Format uptime
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }

    // Clear all cache
    async clearAllCache() {
        try {
            // Clear memory cache
            this.cache.clear();
            this.cacheExpiry.clear();

            // Clear database cache
            await new Promise((resolve, reject) => {
                const query = `DELETE FROM api_response_cache`;
                
                this.db.run(query, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
            });

            await this.recordMetric('cache', 'cache_clear_all', 1, 'count');
            console.log('🧹 All cache cleared');
            
            return { success: true, message: 'All cache cleared successfully' };
        } catch (error) {
            console.error('Error clearing cache:', error);
            throw error;
        }
    }

    // Mark optimization suggestion as implemented
    async markSuggestionImplemented(suggestionId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE optimization_suggestions 
                SET status = 'implemented', implemented_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.run(query, [suggestionId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }
}

module.exports = new PerformanceOptimizationService();
