const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class DatabaseOptimizationService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.backupPath = path.join(__dirname, '..', 'data', 'backups');

        // Advanced features
        this.connectionPool = [];
        this.maxConnections = 10;
        this.queryCache = new Map();
        this.queryStats = new Map();
        this.slowQueryThreshold = 100; // ms
        this.preparedStatements = new Map();

        this.initializeOptimizationTables();
        this.ensureBackupDirectory();
        this.initializeConnectionPool();
        this.startQueryMonitoring();

        // Performance thresholds
        this.performanceThresholds = {
            queryTime: 100, // ms
            dbSize: 100 * 1024 * 1024, // 100MB
            tableSize: 10 * 1024 * 1024, // 10MB
            indexEfficiency: 0.8 // 80%
        };
    }

    // Initialize optimization tracking tables
    initializeOptimizationTables() {
        const createOptimizationTables = `
            CREATE TABLE IF NOT EXISTS db_performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                table_name TEXT,
                query_type TEXT,
                execution_time REAL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS db_maintenance_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_type TEXT NOT NULL, -- 'vacuum', 'reindex', 'analyze', 'backup', 'cleanup'
                table_name TEXT,
                duration_ms INTEGER,
                rows_affected INTEGER,
                size_before INTEGER,
                size_after INTEGER,
                status TEXT NOT NULL, -- 'success', 'failed', 'partial'
                error_message TEXT,
                performed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS query_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_hash TEXT NOT NULL,
                query_pattern TEXT NOT NULL,
                execution_time REAL NOT NULL,
                rows_examined INTEGER,
                rows_returned INTEGER,
                table_scans INTEGER DEFAULT 0,
                index_usage TEXT, -- JSON string
                optimization_suggestions TEXT,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        this.db.exec(createOptimizationTables, (err) => {
            if (err) {
                console.error('Error creating optimization tables:', err);
            } else {
                console.log('✅ Database optimization tables initialized');
                this.createOptimalIndexes();
            }
        });
    }

    // Ensure backup directory exists
    async ensureBackupDirectory() {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create backup directory:', error);
        }
    }

    // Initialize connection pool for better performance
    async initializeConnectionPool() {
        try {
            for (let i = 0; i < this.maxConnections; i++) {
                const connection = new sqlite3.Database(this.dbPath);
                connection.configure('busyTimeout', 30000); // 30 second timeout

                // Enable WAL mode for better concurrency
                await new Promise((resolve, reject) => {
                    connection.run('PRAGMA journal_mode = WAL', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Optimize SQLite settings
                await new Promise((resolve, reject) => {
                    connection.exec(`
                        PRAGMA synchronous = NORMAL;
                        PRAGMA cache_size = 10000;
                        PRAGMA temp_store = MEMORY;
                        PRAGMA mmap_size = 268435456;
                        PRAGMA optimize;
                    `, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                this.connectionPool.push({
                    connection,
                    inUse: false,
                    lastUsed: Date.now()
                });
            }

            console.log(`✅ Database connection pool initialized with ${this.maxConnections} connections`);
        } catch (error) {
            console.error('Failed to initialize connection pool:', error);
        }
    }

    // Get connection from pool
    async getConnection() {
        const availableConnection = this.connectionPool.find(conn => !conn.inUse);

        if (availableConnection) {
            availableConnection.inUse = true;
            availableConnection.lastUsed = Date.now();
            return availableConnection;
        }

        // If no connection available, wait and retry
        await new Promise(resolve => setTimeout(resolve, 10));
        return this.getConnection();
    }

    // Release connection back to pool
    releaseConnection(poolConnection) {
        poolConnection.inUse = false;
        poolConnection.lastUsed = Date.now();
    }

    // Start query monitoring
    startQueryMonitoring() {
        // Monitor query performance every minute
        setInterval(() => {
            this.analyzeQueryPerformance();
        }, 60000);

        // Clean query cache every 5 minutes
        setInterval(() => {
            this.cleanQueryCache();
        }, 5 * 60 * 1000);

        // Generate optimization suggestions every 10 minutes
        setInterval(() => {
            this.generateOptimizationSuggestions();
        }, 10 * 60 * 1000);
    }

    // Prepare statement for reuse
    async prepareStatement(sql, key) {
        if (this.preparedStatements.has(key)) {
            return this.preparedStatements.get(key);
        }

        const poolConnection = await this.getConnection();

        return new Promise((resolve, reject) => {
            const stmt = poolConnection.connection.prepare(sql, (err) => {
                this.releaseConnection(poolConnection);

                if (err) {
                    reject(err);
                } else {
                    this.preparedStatements.set(key, stmt);
                    resolve(stmt);
                }
            });
        });
    }

    // Create optimal indexes for better performance
    async createOptimalIndexes() {
        const indexes = [
            // Content generation indexes
            'CREATE INDEX IF NOT EXISTS idx_content_niche_date ON content (niche_id, created_at)',
            'CREATE INDEX IF NOT EXISTS idx_content_quality_score ON content (quality_score)',
            
            // Analytics indexes
            'CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics (date)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics (metric_name, date)',
            
            // Twitter posts indexes
            'CREATE INDEX IF NOT EXISTS idx_twitter_posts_date ON twitter_posts (posted_at)',
            'CREATE INDEX IF NOT EXISTS idx_twitter_posts_niche ON twitter_posts (niche_id, posted_at)',
            'CREATE INDEX IF NOT EXISTS idx_twitter_posts_success ON twitter_posts (is_successful, posted_at)',
            
            // Error logs indexes
            'CREATE INDEX IF NOT EXISTS idx_error_logs_date ON error_logs (created_at)',
            'CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs (category, severity)',
            'CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs (is_resolved, created_at)',
            
            // Templates indexes
            'CREATE INDEX IF NOT EXISTS idx_templates_category ON content_templates (category, is_public)',
            'CREATE INDEX IF NOT EXISTS idx_templates_usage ON content_templates (usage_count DESC)',
            
            // Hashtag research indexes
            'CREATE INDEX IF NOT EXISTS idx_hashtags_category ON hashtag_research (category, popularity_score)',
            'CREATE INDEX IF NOT EXISTS idx_hashtags_niche ON hashtag_research (niche_id, is_banned)',
            
            // Performance indexes
            'CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON db_performance_metrics (recorded_at)',
            'CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance (query_hash)'
        ];

        for (const indexSQL of indexes) {
            try {
                await this.executeQuery(indexSQL);
            } catch (error) {
                console.error('Failed to create index:', error);
            }
        }

        console.log('✅ Database indexes optimized');
    }

    // Execute query with advanced optimization
    async executeQuery(query, params = [], options = {}) {
        const { useCache = true, cacheKey = null, cacheTTL = 300000 } = options; // 5 min default TTL
        const startTime = Date.now();

        // Check cache first
        if (useCache) {
            const cached = this.getFromQueryCache(cacheKey || this.generateQueryHash(query + JSON.stringify(params)));
            if (cached) {
                return cached;
            }
        }

        // Use connection pool
        const poolConnection = await this.getConnection();

        return new Promise((resolve, reject) => {
            poolConnection.connection.all(query, params, (err, rows) => {
                const executionTime = Date.now() - startTime;
                this.releaseConnection(poolConnection);

                if (err) {
                    this.logQueryPerformance(query, executionTime, 0, 0, true);
                    reject(err);
                } else {
                    this.logQueryPerformance(query, executionTime, rows.length, rows.length);

                    // Cache successful results
                    if (useCache && rows.length > 0) {
                        this.setQueryCache(cacheKey || this.generateQueryHash(query + JSON.stringify(params)), rows, cacheTTL);
                    }

                    resolve(rows);
                }
            });
        });
    }

    // Execute optimized query with prepared statements
    async executeOptimizedQuery(sql, params = [], options = {}) {
        const { useCache = true, preparedKey = null } = options;
        const startTime = Date.now();

        try {
            // Use prepared statement if available
            if (preparedKey) {
                const stmt = await this.prepareStatement(sql, preparedKey);

                return new Promise((resolve, reject) => {
                    stmt.all(params, (err, rows) => {
                        const executionTime = Date.now() - startTime;

                        if (err) {
                            this.logQueryPerformance(sql, executionTime, 0, 0, true);
                            reject(err);
                        } else {
                            this.logQueryPerformance(sql, executionTime, rows.length, rows.length);
                            resolve(rows);
                        }
                    });
                });
            } else {
                return this.executeQuery(sql, params, options);
            }
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.logQueryPerformance(sql, executionTime, 0, 0, true);
            throw error;
        }
    }

    // Query cache management
    setQueryCache(key, data, ttl) {
        this.queryCache.set(key, {
            data,
            expires: Date.now() + ttl,
            hits: 0
        });
    }

    getFromQueryCache(key) {
        const cached = this.queryCache.get(key);
        if (cached && Date.now() < cached.expires) {
            cached.hits++;
            return cached.data;
        } else if (cached) {
            this.queryCache.delete(key);
        }
        return null;
    }

    cleanQueryCache() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.queryCache.entries()) {
            if (now >= value.expires) {
                this.queryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired query cache entries`);
        }
    }

    // Analyze query performance and suggest optimizations
    async analyzeQueryPerformance() {
        try {
            const slowQueries = await this.executeQuery(`
                SELECT query_pattern, AVG(execution_time) as avg_time, COUNT(*) as count,
                       MAX(execution_time) as max_time, MIN(execution_time) as min_time
                FROM query_performance
                WHERE recorded_at > datetime('now', '-1 hour')
                GROUP BY query_hash
                HAVING avg_time > ?
                ORDER BY avg_time DESC
                LIMIT 10
            `, [this.slowQueryThreshold]);

            for (const query of slowQueries) {
                await this.suggestQueryOptimization(query);
            }
        } catch (error) {
            console.error('Error analyzing query performance:', error);
        }
    }

    // Suggest query optimizations
    async suggestQueryOptimization(queryInfo) {
        const suggestions = [];
        const pattern = queryInfo.query_pattern.toLowerCase();

        // Check for missing indexes
        if (pattern.includes('where') && !pattern.includes('index')) {
            suggestions.push('Consider adding an index on WHERE clause columns');
        }

        // Check for SELECT *
        if (pattern.includes('select *')) {
            suggestions.push('Avoid SELECT * - specify only needed columns');
        }

        // Check for ORDER BY without LIMIT
        if (pattern.includes('order by') && !pattern.includes('limit')) {
            suggestions.push('Consider adding LIMIT to ORDER BY queries');
        }

        // Check for subqueries
        if (pattern.includes('select') && pattern.split('select').length > 2) {
            suggestions.push('Consider using JOINs instead of subqueries for better performance');
        }

        // Check for LIKE with leading wildcard
        if (pattern.includes("like '%")) {
            suggestions.push('Avoid LIKE with leading wildcards - consider full-text search');
        }

        if (suggestions.length > 0) {
            console.log(`🔍 Query optimization suggestions for pattern: ${queryInfo.query_pattern}`);
            console.log(`   Average time: ${queryInfo.avg_time.toFixed(2)}ms`);
            suggestions.forEach(suggestion => console.log(`   - ${suggestion}`));
        }
    }

    // Generate optimization suggestions
    async generateOptimizationSuggestions() {
        try {
            const suggestions = [];

            // Check database size
            const dbSize = await this.getDatabaseSize();
            if (dbSize > this.performanceThresholds.dbSize) {
                suggestions.push({
                    type: 'database_size',
                    priority: 'medium',
                    message: `Database size (${this.formatBytes(dbSize)}) exceeds threshold`,
                    action: 'Consider archiving old data or running cleanup'
                });
            }

            // Check for tables without indexes
            const tablesWithoutIndexes = await this.findTablesWithoutIndexes();
            if (tablesWithoutIndexes.length > 0) {
                suggestions.push({
                    type: 'missing_indexes',
                    priority: 'high',
                    message: `${tablesWithoutIndexes.length} tables may benefit from indexes`,
                    action: `Add indexes to: ${tablesWithoutIndexes.join(', ')}`
                });
            }

            // Check query cache efficiency
            const cacheStats = this.getQueryCacheStats();
            if (cacheStats.hitRate < 0.5) {
                suggestions.push({
                    type: 'cache_efficiency',
                    priority: 'medium',
                    message: `Query cache hit rate is low (${(cacheStats.hitRate * 100).toFixed(1)}%)`,
                    action: 'Increase cache TTL or optimize frequently used queries'
                });
            }

            return suggestions;
        } catch (error) {
            console.error('Error generating optimization suggestions:', error);
            return [];
        }
    }

    // Find tables that might benefit from indexes
    async findTablesWithoutIndexes() {
        try {
            const tables = await this.executeQuery(`
                SELECT name FROM sqlite_master
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);

            const tablesNeedingIndexes = [];

            for (const table of tables) {
                const indexes = await this.executeQuery(`
                    SELECT COUNT(*) as index_count
                    FROM sqlite_master
                    WHERE type='index' AND tbl_name=?
                `, [table.name]);

                const rowCount = await this.getTableRowCount(table.name);

                // Suggest indexes for tables with many rows but few indexes
                if (rowCount > 1000 && indexes[0].index_count < 2) {
                    tablesNeedingIndexes.push(table.name);
                }
            }

            return tablesNeedingIndexes;
        } catch (error) {
            console.error('Error finding tables without indexes:', error);
            return [];
        }
    }

    // Get query cache statistics
    getQueryCacheStats() {
        let totalHits = 0;
        let totalEntries = 0;

        for (const [key, value] of this.queryCache.entries()) {
            totalHits += value.hits;
            totalEntries++;
        }

        return {
            entries: totalEntries,
            totalHits,
            hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
            memoryUsage: this.queryCache.size
        };
    }

    // Log query performance
    async logQueryPerformance(query, executionTime, rowsExamined, rowsReturned, hasError = false) {
        try {
            if (executionTime > this.performanceThresholds.queryTime || hasError) {
                const queryHash = this.generateQueryHash(query);
                const queryPattern = this.extractQueryPattern(query);
                
                const logQuery = `
                    INSERT INTO query_performance 
                    (query_hash, query_pattern, execution_time, rows_examined, rows_returned)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                this.db.run(logQuery, [
                    queryHash,
                    queryPattern,
                    executionTime,
                    rowsExamined,
                    rowsReturned
                ]);
            }
        } catch (error) {
            console.error('Failed to log query performance:', error);
        }
    }

    // Generate query hash for grouping similar queries
    generateQueryHash(query) {
        const normalized = query
            .replace(/\s+/g, ' ')
            .replace(/\d+/g, 'NUM')
            .replace(/'[^']*'/g, 'STR')
            .toLowerCase()
            .trim();
        
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // Extract query pattern for analysis
    extractQueryPattern(query) {
        return query
            .replace(/\s+/g, ' ')
            .replace(/\d+/g, '?')
            .replace(/'[^']*'/g, '?')
            .replace(/\([^)]*\)/g, '(?)')
            .trim()
            .substring(0, 200);
    }

    // Perform database vacuum
    async vacuum() {
        const startTime = Date.now();
        const sizeBefore = await this.getDatabaseSize();
        
        try {
            await new Promise((resolve, reject) => {
                this.db.run('VACUUM', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            const duration = Date.now() - startTime;
            const sizeAfter = await this.getDatabaseSize();
            
            await this.logMaintenanceOperation('vacuum', null, duration, 0, sizeBefore, sizeAfter, 'success');
            
            console.log(`✅ Database vacuum completed in ${duration}ms. Size reduced from ${this.formatBytes(sizeBefore)} to ${this.formatBytes(sizeAfter)}`);
            
            return { success: true, duration, sizeBefore, sizeAfter };
        } catch (error) {
            await this.logMaintenanceOperation('vacuum', null, Date.now() - startTime, 0, sizeBefore, sizeBefore, 'failed', error.message);
            throw error;
        }
    }

    // Reindex all tables
    async reindexAll() {
        const startTime = Date.now();
        
        try {
            await new Promise((resolve, reject) => {
                this.db.run('REINDEX', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            const duration = Date.now() - startTime;
            await this.logMaintenanceOperation('reindex', null, duration, 0, 0, 0, 'success');
            
            console.log(`✅ Database reindex completed in ${duration}ms`);
            return { success: true, duration };
        } catch (error) {
            await this.logMaintenanceOperation('reindex', null, Date.now() - startTime, 0, 0, 0, 'failed', error.message);
            throw error;
        }
    }

    // Analyze database statistics
    async analyze() {
        const startTime = Date.now();
        
        try {
            await new Promise((resolve, reject) => {
                this.db.run('ANALYZE', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            const duration = Date.now() - startTime;
            await this.logMaintenanceOperation('analyze', null, duration, 0, 0, 0, 'success');
            
            console.log(`✅ Database analyze completed in ${duration}ms`);
            return { success: true, duration };
        } catch (error) {
            await this.logMaintenanceOperation('analyze', null, Date.now() - startTime, 0, 0, 0, 'failed', error.message);
            throw error;
        }
    }

    // Create database backup
    async createBackup() {
        const startTime = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `content_db_backup_${timestamp}.db`;
        const backupFilePath = path.join(this.backupPath, backupFileName);
        
        try {
            await fs.copyFile(this.dbPath, backupFilePath);
            
            const duration = Date.now() - startTime;
            const backupSize = await this.getFileSize(backupFilePath);
            
            await this.logMaintenanceOperation('backup', null, duration, 0, 0, backupSize, 'success');
            
            console.log(`✅ Database backup created: ${backupFileName} (${this.formatBytes(backupSize)})`);
            
            // Clean up old backups (keep last 10)
            await this.cleanupOldBackups();
            
            return { success: true, duration, backupFile: backupFileName, size: backupSize };
        } catch (error) {
            await this.logMaintenanceOperation('backup', null, Date.now() - startTime, 0, 0, 0, 'failed', error.message);
            throw error;
        }
    }

    // Clean up old data
    async cleanupOldData(daysToKeep = 90) {
        const startTime = Date.now();
        let totalRowsDeleted = 0;
        
        try {
            const cleanupQueries = [
                // Clean old error logs
                `DELETE FROM error_logs WHERE created_at < datetime('now', '-${daysToKeep} days') AND is_resolved = 1`,
                
                // Clean old performance metrics
                `DELETE FROM db_performance_metrics WHERE recorded_at < datetime('now', '-${daysToKeep} days')`,
                
                // Clean old query performance logs
                `DELETE FROM query_performance WHERE recorded_at < datetime('now', '-${daysToKeep} days')`,
                
                // Clean old analytics data (keep aggregated data)
                `DELETE FROM analytics WHERE date < date('now', '-${daysToKeep} days') AND metric_name NOT LIKE '%_total'`,
                
                // Clean old maintenance logs
                `DELETE FROM db_maintenance_log WHERE performed_at < datetime('now', '-${daysToKeep} days')`
            ];
            
            for (const query of cleanupQueries) {
                const result = await new Promise((resolve, reject) => {
                    this.db.run(query, function(err) {
                        if (err) reject(err);
                        else resolve(this.changes);
                    });
                });
                totalRowsDeleted += result;
            }
            
            const duration = Date.now() - startTime;
            await this.logMaintenanceOperation('cleanup', null, duration, totalRowsDeleted, 0, 0, 'success');
            
            console.log(`✅ Database cleanup completed. Removed ${totalRowsDeleted} old records in ${duration}ms`);
            
            return { success: true, duration, rowsDeleted: totalRowsDeleted };
        } catch (error) {
            await this.logMaintenanceOperation('cleanup', null, Date.now() - startTime, totalRowsDeleted, 0, 0, 'failed', error.message);
            throw error;
        }
    }

    // Get comprehensive database statistics
    async getDatabaseStatistics() {
        try {
            const stats = {};

            // Database size
            stats.databaseSize = await this.getDatabaseSize();

            // Connection pool statistics
            stats.connectionPool = {
                totalConnections: this.connectionPool.length,
                activeConnections: this.connectionPool.filter(conn => conn.inUse).length,
                availableConnections: this.connectionPool.filter(conn => !conn.inUse).length
            };

            // Query cache statistics
            stats.queryCache = this.getQueryCacheStats();

            // Table statistics
            const tableStats = await this.executeQuery(`
                SELECT name,
                       (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as table_count
                FROM sqlite_master m WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);

            stats.tables = {};
            for (const table of tableStats) {
                const rowCount = await this.getTableRowCount(table.name);
                const tableSize = await this.getTableSize(table.name);

                stats.tables[table.name] = {
                    rowCount,
                    estimatedSize: tableSize
                };
            }

            // Index statistics
            stats.indexes = await this.getIndexStatistics();

            // Performance metrics
            stats.performance = await this.getPerformanceMetrics();

            // Recent maintenance
            stats.lastMaintenance = await this.getLastMaintenanceOperations();

            // Optimization suggestions
            stats.optimizationSuggestions = await this.generateOptimizationSuggestions();

            return stats;
        } catch (error) {
            console.error('Failed to get database statistics:', error);
            throw error;
        }
    }

    // Get index statistics
    async getIndexStatistics() {
        try {
            const indexes = await this.executeQuery(`
                SELECT name, tbl_name, sql
                FROM sqlite_master
                WHERE type='index' AND name NOT LIKE 'sqlite_%'
                ORDER BY tbl_name, name
            `);

            const indexStats = {
                totalIndexes: indexes.length,
                indexesByTable: {}
            };

            for (const index of indexes) {
                if (!indexStats.indexesByTable[index.tbl_name]) {
                    indexStats.indexesByTable[index.tbl_name] = [];
                }
                indexStats.indexesByTable[index.tbl_name].push({
                    name: index.name,
                    sql: index.sql
                });
            }

            return indexStats;
        } catch (error) {
            console.error('Error getting index statistics:', error);
            return { totalIndexes: 0, indexesByTable: {} };
        }
    }

    // Get table row count
    async getTableRowCount(tableName) {
        try {
            const result = await this.executeQuery(`SELECT COUNT(*) as count FROM "${tableName}"`);
            return result[0]?.count || 0;
        } catch (error) {
            return 0;
        }
    }

    // Get estimated table size
    async getTableSize(tableName) {
        try {
            const result = await this.executeQuery(`
                SELECT SUM(pgsize) as size 
                FROM dbstat 
                WHERE name = ?
            `, [tableName]);
            return result[0]?.size || 0;
        } catch (error) {
            return 0;
        }
    }

    // Get database size
    async getDatabaseSize() {
        try {
            const stats = await fs.stat(this.dbPath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    // Get file size
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    // Get performance metrics
    async getPerformanceMetrics() {
        try {
            const slowQueries = await this.executeQuery(`
                SELECT query_pattern, AVG(execution_time) as avg_time, COUNT(*) as count
                FROM query_performance 
                WHERE recorded_at > datetime('now', '-24 hours')
                GROUP BY query_hash
                ORDER BY avg_time DESC
                LIMIT 10
            `);
            
            return {
                slowQueries,
                averageQueryTime: slowQueries.reduce((sum, q) => sum + q.avg_time, 0) / slowQueries.length || 0
            };
        } catch (error) {
            return { slowQueries: [], averageQueryTime: 0 };
        }
    }

    // Get last maintenance operations
    async getLastMaintenanceOperations() {
        try {
            return await this.executeQuery(`
                SELECT operation_type, duration_ms, status, performed_at
                FROM db_maintenance_log
                ORDER BY performed_at DESC
                LIMIT 10
            `);
        } catch (error) {
            return [];
        }
    }

    // Log maintenance operation
    async logMaintenanceOperation(operationType, tableName, duration, rowsAffected, sizeBefore, sizeAfter, status, errorMessage = null) {
        try {
            const query = `
                INSERT INTO db_maintenance_log 
                (operation_type, table_name, duration_ms, rows_affected, size_before, size_after, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                operationType,
                tableName,
                duration,
                rowsAffected,
                sizeBefore,
                sizeAfter,
                status,
                errorMessage
            ]);
        } catch (error) {
            console.error('Failed to log maintenance operation:', error);
        }
    }

    // Clean up old backups
    async cleanupOldBackups(keepCount = 10) {
        try {
            const files = await fs.readdir(this.backupPath);
            const backupFiles = files
                .filter(file => file.startsWith('content_db_backup_') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupPath, file)
                }))
                .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (timestamp) descending
            
            if (backupFiles.length > keepCount) {
                const filesToDelete = backupFiles.slice(keepCount);
                
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    console.log(`🗑️ Deleted old backup: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
        }
    }

    // Format bytes to human readable
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Perform full optimization
    async performFullOptimization() {
        console.log('🔧 Starting full database optimization...');
        
        const results = {
            backup: null,
            cleanup: null,
            vacuum: null,
            reindex: null,
            analyze: null
        };
        
        try {
            // 1. Create backup
            results.backup = await this.createBackup();
            
            // 2. Clean up old data
            results.cleanup = await this.cleanupOldData();
            
            // 3. Vacuum database
            results.vacuum = await this.vacuum();
            
            // 4. Reindex
            results.reindex = await this.reindexAll();
            
            // 5. Analyze
            results.analyze = await this.analyze();
            
            console.log('✅ Full database optimization completed successfully');
            return { success: true, results };
            
        } catch (error) {
            console.error('❌ Database optimization failed:', error);
            return { success: false, error: error.message, results };
        }
    }
}

module.exports = new DatabaseOptimizationService();
