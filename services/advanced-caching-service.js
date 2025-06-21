const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

class AdvancedCachingService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.memoryCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };
        this.maxMemorySize = 100 * 1024 * 1024; // 100MB
        this.currentMemorySize = 0;
        this.initializeCacheTables();
        this.startCleanupScheduler();
    }

    // Initialize advanced cache tables
    initializeCacheTables() {
        const createCacheTables = `
            CREATE TABLE IF NOT EXISTS advanced_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT UNIQUE NOT NULL,
                cache_value TEXT NOT NULL,
                content_type TEXT DEFAULT 'json',
                size_bytes INTEGER DEFAULT 0,
                ttl_seconds INTEGER DEFAULT 3600,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                access_count INTEGER DEFAULT 0,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                tags TEXT, -- JSON array of tags for cache invalidation
                compression TEXT DEFAULT 'none', -- 'none', 'gzip', 'brotli'
                priority INTEGER DEFAULT 1 -- 1=low, 2=medium, 3=high
            );

            CREATE TABLE IF NOT EXISTS cache_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT NOT NULL,
                operation TEXT NOT NULL, -- 'hit', 'miss', 'set', 'delete', 'evict'
                response_time_ms REAL,
                size_bytes INTEGER,
                ttl_seconds INTEGER,
                tags TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cache_invalidation_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_name TEXT UNIQUE NOT NULL,
                pattern TEXT NOT NULL, -- regex pattern for cache keys
                tags TEXT, -- JSON array of tags to invalidate
                trigger_events TEXT, -- JSON array of events that trigger this rule
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_cache_key ON advanced_cache(cache_key);
            CREATE INDEX IF NOT EXISTS idx_cache_expires ON advanced_cache(expires_at);
            CREATE INDEX IF NOT EXISTS idx_cache_tags ON advanced_cache(tags);
            CREATE INDEX IF NOT EXISTS idx_cache_priority ON advanced_cache(priority);
            CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON cache_analytics(timestamp);
        `;

        this.db.exec(createCacheTables, (err) => {
            if (err) {
                console.error('Error creating cache tables:', err);
            } else {
                console.log('✅ Advanced caching tables initialized');
                this.loadInvalidationRules();
            }
        });
    }

    // Generate cache key with optional namespace
    generateCacheKey(key, namespace = 'default') {
        const hash = crypto.createHash('sha256').update(`${namespace}:${key}`).digest('hex').substring(0, 16);
        return `${namespace}:${hash}`;
    }

    // Set cache with advanced options
    async set(key, value, options = {}) {
        const startTime = performance.now();
        const {
            ttl = 3600,
            tags = [],
            priority = 1,
            compression = 'none',
            namespace = 'default'
        } = options;

        try {
            const cacheKey = this.generateCacheKey(key, namespace);
            const serializedValue = JSON.stringify(value);
            const sizeBytes = Buffer.byteLength(serializedValue, 'utf8');
            const expiresAt = new Date(Date.now() + (ttl * 1000));

            // Compress if requested
            let finalValue = serializedValue;
            if (compression === 'gzip') {
                const zlib = require('zlib');
                finalValue = zlib.gzipSync(serializedValue).toString('base64');
            }

            // Store in memory cache if size allows
            if (this.currentMemorySize + sizeBytes <= this.maxMemorySize) {
                this.memoryCache.set(cacheKey, {
                    value: finalValue,
                    expiresAt: expiresAt.getTime(),
                    compression,
                    priority,
                    tags,
                    accessCount: 0
                });
                this.currentMemorySize += sizeBytes;
            } else {
                // Evict low priority items
                await this.evictLowPriorityItems(sizeBytes);
            }

            // Store in database
            await this.setInDatabase(cacheKey, finalValue, {
                ttl,
                tags,
                priority,
                compression,
                sizeBytes,
                expiresAt
            });

            this.cacheStats.sets++;
            const responseTime = performance.now() - startTime;
            await this.recordAnalytics(cacheKey, 'set', responseTime, sizeBytes, ttl, tags);

            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    // Get cache with analytics
    async get(key, namespace = 'default') {
        const startTime = performance.now();
        const cacheKey = this.generateCacheKey(key, namespace);

        try {
            // Check memory cache first
            const memoryResult = this.memoryCache.get(cacheKey);
            if (memoryResult && Date.now() < memoryResult.expiresAt) {
                memoryResult.accessCount++;
                this.cacheStats.hits++;
                
                const responseTime = performance.now() - startTime;
                await this.recordAnalytics(cacheKey, 'hit', responseTime, 0, 0, memoryResult.tags);
                
                return this.decompressValue(memoryResult.value, memoryResult.compression);
            }

            // Check database cache
            const dbResult = await this.getFromDatabase(cacheKey);
            if (dbResult) {
                // Restore to memory cache if space allows
                const sizeBytes = dbResult.size_bytes || 0;
                if (this.currentMemorySize + sizeBytes <= this.maxMemorySize) {
                    this.memoryCache.set(cacheKey, {
                        value: dbResult.cache_value,
                        expiresAt: new Date(dbResult.expires_at).getTime(),
                        compression: dbResult.compression,
                        priority: dbResult.priority,
                        tags: JSON.parse(dbResult.tags || '[]'),
                        accessCount: dbResult.access_count + 1
                    });
                    this.currentMemorySize += sizeBytes;
                }

                this.cacheStats.hits++;
                const responseTime = performance.now() - startTime;
                await this.recordAnalytics(cacheKey, 'hit', responseTime, sizeBytes, 0, JSON.parse(dbResult.tags || '[]'));
                
                return this.decompressValue(dbResult.cache_value, dbResult.compression);
            }

            // Cache miss
            this.cacheStats.misses++;
            const responseTime = performance.now() - startTime;
            await this.recordAnalytics(cacheKey, 'miss', responseTime, 0, 0, []);
            
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    // Decompress cached value
    decompressValue(value, compression) {
        try {
            if (compression === 'gzip') {
                const zlib = require('zlib');
                const decompressed = zlib.gunzipSync(Buffer.from(value, 'base64')).toString();
                return JSON.parse(decompressed);
            }
            return JSON.parse(value);
        } catch (error) {
            console.error('Decompression error:', error);
            return null;
        }
    }

    // Set in database
    async setInDatabase(cacheKey, value, options) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO advanced_cache 
                (cache_key, cache_value, size_bytes, ttl_seconds, expires_at, tags, compression, priority)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                cacheKey,
                value,
                options.sizeBytes,
                options.ttl,
                options.expiresAt.toISOString(),
                JSON.stringify(options.tags),
                options.compression,
                options.priority
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get from database
    async getFromDatabase(cacheKey) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM advanced_cache 
                WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
            `;

            this.db.get(query, [cacheKey], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        // Update access count
                        this.updateAccessCount(cacheKey);
                    }
                    resolve(row);
                }
            });
        });
    }

    // Update access count
    async updateAccessCount(cacheKey) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE advanced_cache 
                SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE cache_key = ?
            `;

            this.db.run(query, [cacheKey], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Evict low priority items from memory
    async evictLowPriorityItems(requiredSpace) {
        const items = Array.from(this.memoryCache.entries())
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => {
                // Sort by priority (low first), then by access count (low first)
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.accessCount - b.accessCount;
            });

        let freedSpace = 0;
        for (const item of items) {
            if (freedSpace >= requiredSpace) break;
            
            const itemSize = Buffer.byteLength(JSON.stringify(item.value), 'utf8');
            this.memoryCache.delete(item.key);
            this.currentMemorySize -= itemSize;
            freedSpace += itemSize;
            this.cacheStats.evictions++;
            
            await this.recordAnalytics(item.key, 'evict', 0, itemSize, 0, item.tags);
        }
    }

    // Invalidate cache by tags
    async invalidateByTags(tags) {
        const startTime = performance.now();
        let invalidatedCount = 0;

        try {
            // Invalidate from memory cache
            for (const [key, value] of this.memoryCache.entries()) {
                if (value.tags && value.tags.some(tag => tags.includes(tag))) {
                    this.memoryCache.delete(key);
                    invalidatedCount++;
                }
            }

            // Invalidate from database
            const query = `
                DELETE FROM advanced_cache 
                WHERE tags LIKE ? OR tags LIKE ? OR tags LIKE ?
            `;
            
            const patterns = tags.map(tag => `%"${tag}"%`);
            
            await new Promise((resolve, reject) => {
                this.db.run(query, patterns, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        invalidatedCount += this.changes;
                        resolve(this.changes);
                    }
                });
            });

            const responseTime = performance.now() - startTime;
            console.log(`🗑️ Invalidated ${invalidatedCount} cache entries by tags: ${tags.join(', ')} in ${responseTime.toFixed(2)}ms`);
            
            return invalidatedCount;
        } catch (error) {
            console.error('Cache invalidation error:', error);
            return 0;
        }
    }

    // Record analytics
    async recordAnalytics(cacheKey, operation, responseTime, sizeBytes, ttl, tags) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO cache_analytics 
                (cache_key, operation, response_time_ms, size_bytes, ttl_seconds, tags)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                cacheKey,
                operation,
                responseTime,
                sizeBytes,
                ttl,
                JSON.stringify(tags)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Load invalidation rules
    async loadInvalidationRules() {
        // Add default invalidation rules
        const defaultRules = [
            {
                rule_name: 'content_update',
                pattern: 'content:.*',
                tags: ['content', 'analytics'],
                trigger_events: ['content_created', 'content_updated', 'content_deleted']
            },
            {
                rule_name: 'niche_update',
                pattern: 'niche:.*',
                tags: ['niche', 'analytics'],
                trigger_events: ['niche_created', 'niche_updated', 'niche_deleted']
            },
            {
                rule_name: 'analytics_update',
                pattern: 'analytics:.*',
                tags: ['analytics'],
                trigger_events: ['content_created', 'content_updated', 'analytics_refresh']
            }
        ];

        for (const rule of defaultRules) {
            await this.addInvalidationRule(rule);
        }
    }

    // Add invalidation rule
    async addInvalidationRule(rule) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR IGNORE INTO cache_invalidation_rules 
                (rule_name, pattern, tags, trigger_events)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(query, [
                rule.rule_name,
                rule.pattern,
                JSON.stringify(rule.tags),
                JSON.stringify(rule.trigger_events)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Start cleanup scheduler
    startCleanupScheduler() {
        // Clean expired entries every 5 minutes
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, 5 * 60 * 1000);

        // Generate cache report every hour
        setInterval(() => {
            this.generateCacheReport();
        }, 60 * 60 * 1000);
    }

    // Cleanup expired entries
    async cleanupExpiredEntries() {
        try {
            // Clean memory cache
            const now = Date.now();
            let cleanedMemory = 0;
            for (const [key, value] of this.memoryCache.entries()) {
                if (now >= value.expiresAt) {
                    this.memoryCache.delete(key);
                    cleanedMemory++;
                }
            }

            // Clean database cache
            const cleanedDB = await new Promise((resolve, reject) => {
                const query = `DELETE FROM advanced_cache WHERE expires_at <= CURRENT_TIMESTAMP`;
                
                this.db.run(query, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
            });

            if (cleanedMemory > 0 || cleanedDB > 0) {
                console.log(`🧹 Cleaned ${cleanedMemory} memory entries and ${cleanedDB} database entries`);
            }
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }

    // Generate cache report
    async generateCacheReport() {
        try {
            const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
            const memoryUsage = (this.currentMemorySize / this.maxMemorySize) * 100;
            
            console.log(`📊 Cache Report:
                Hit Rate: ${hitRate.toFixed(2)}%
                Memory Usage: ${memoryUsage.toFixed(2)}%
                Total Hits: ${this.cacheStats.hits}
                Total Misses: ${this.cacheStats.misses}
                Total Sets: ${this.cacheStats.sets}
                Total Evictions: ${this.cacheStats.evictions}
            `);
        } catch (error) {
            console.error('Cache report error:', error);
        }
    }

    // Get cache statistics
    getCacheStats() {
        const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
        const memoryUsage = (this.currentMemorySize / this.maxMemorySize) * 100;
        
        return {
            ...this.cacheStats,
            hitRate: isNaN(hitRate) ? 0 : hitRate,
            memoryUsage,
            memorySize: this.currentMemorySize,
            maxMemorySize: this.maxMemorySize,
            entriesInMemory: this.memoryCache.size
        };
    }
}

module.exports = new AdvancedCachingService();
