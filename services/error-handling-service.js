const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class ErrorHandlingService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.logPath = path.join(__dirname, '..', 'logs');
        this.initializeErrorTables();
        this.ensureLogDirectory();
        
        // Error categories and their severity levels
        this.errorCategories = {
            API_ERROR: { severity: 'high', retryable: true },
            DATABASE_ERROR: { severity: 'critical', retryable: false },
            VALIDATION_ERROR: { severity: 'medium', retryable: false },
            NETWORK_ERROR: { severity: 'high', retryable: true },
            AUTH_ERROR: { severity: 'high', retryable: false },
            RATE_LIMIT_ERROR: { severity: 'medium', retryable: true },
            CONTENT_ERROR: { severity: 'low', retryable: false },
            SYSTEM_ERROR: { severity: 'critical', retryable: false }
        };
    }

    // Initialize error tracking tables
    initializeErrorTables() {
        const createErrorTables = `
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_id TEXT UNIQUE,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                stack_trace TEXT,
                context TEXT, -- JSON string with additional context
                user_action TEXT,
                endpoint TEXT,
                method TEXT,
                status_code INTEGER,
                is_resolved BOOLEAN DEFAULT 0,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS error_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_hash TEXT UNIQUE,
                error_message_pattern TEXT NOT NULL,
                category TEXT NOT NULL,
                occurrence_count INTEGER DEFAULT 1,
                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_known_issue BOOLEAN DEFAULT 0,
                solution TEXT,
                prevention_tips TEXT
            );

            CREATE TABLE IF NOT EXISTS system_health (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                status TEXT NOT NULL, -- 'healthy', 'warning', 'critical'
                threshold_warning REAL,
                threshold_critical REAL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS error_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_id TEXT NOT NULL,
                notification_type TEXT NOT NULL, -- 'email', 'console', 'ui'
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                recipient TEXT,
                FOREIGN KEY (error_id) REFERENCES error_logs (error_id)
            );
        `;

        this.db.exec(createErrorTables, (err) => {
            if (err) {
                console.error('Error creating error tracking tables:', err);
            } else {
                console.log('✅ Error tracking tables initialized');
            }
        });
    }

    // Ensure log directory exists
    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.logPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    // Log error with context and categorization
    async logError(error, context = {}) {
        try {
            const errorId = this.generateErrorId();
            const category = this.categorizeError(error, context);
            const severity = this.errorCategories[category]?.severity || 'medium';
            
            const errorData = {
                error_id: errorId,
                category,
                severity,
                message: error.message || 'Unknown error',
                stack_trace: error.stack || '',
                context: JSON.stringify(context),
                user_action: context.userAction || null,
                endpoint: context.endpoint || null,
                method: context.method || null,
                status_code: context.statusCode || null,
                retry_count: 0,
                max_retries: this.errorCategories[category]?.retryable ? 3 : 0
            };

            // Save to database
            await this.saveErrorToDatabase(errorData);

            // Log to file
            await this.logToFile(errorData);

            // Track error patterns
            await this.trackErrorPattern(error, category);

            // Send notifications for critical errors
            if (severity === 'critical') {
                await this.sendErrorNotification(errorData);
            }

            console.error(`[${severity.toUpperCase()}] ${category}: ${error.message}`);
            
            return errorId;
        } catch (logError) {
            console.error('Failed to log error:', logError);
            // Fallback to console logging
            console.error('Original error:', error);
        }
    }

    // Categorize error based on type and context
    categorizeError(error, context) {
        const message = error.message?.toLowerCase() || '';
        const stack = error.stack?.toLowerCase() || '';

        // API-related errors
        if (context.endpoint || message.includes('api') || message.includes('fetch')) {
            if (message.includes('rate limit') || context.statusCode === 429) {
                return 'RATE_LIMIT_ERROR';
            }
            if (context.statusCode === 401 || context.statusCode === 403 || message.includes('unauthorized')) {
                return 'AUTH_ERROR';
            }
            if (context.statusCode >= 500 || message.includes('network') || message.includes('timeout')) {
                return 'NETWORK_ERROR';
            }
            return 'API_ERROR';
        }

        // Database errors
        if (message.includes('sqlite') || message.includes('database') || stack.includes('sqlite3')) {
            return 'DATABASE_ERROR';
        }

        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return 'VALIDATION_ERROR';
        }

        // Content-related errors
        if (message.includes('content') || message.includes('generation') || message.includes('template')) {
            return 'CONTENT_ERROR';
        }

        // System errors
        if (message.includes('memory') || message.includes('cpu') || message.includes('disk')) {
            return 'SYSTEM_ERROR';
        }

        return 'API_ERROR'; // Default category
    }

    // Generate unique error ID
    generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Save error to database
    async saveErrorToDatabase(errorData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO error_logs 
                (error_id, category, severity, message, stack_trace, context, user_action, 
                 endpoint, method, status_code, retry_count, max_retries)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                errorData.error_id,
                errorData.category,
                errorData.severity,
                errorData.message,
                errorData.stack_trace,
                errorData.context,
                errorData.user_action,
                errorData.endpoint,
                errorData.method,
                errorData.status_code,
                errorData.retry_count,
                errorData.max_retries
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Log error to file
    async logToFile(errorData) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                ...errorData,
                context: JSON.parse(errorData.context)
            };

            const logFileName = `error_${new Date().toISOString().split('T')[0]}.log`;
            const logFilePath = path.join(this.logPath, logFileName);
            
            await fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // Track error patterns for analysis
    async trackErrorPattern(error, category) {
        try {
            const patternHash = this.generatePatternHash(error.message);
            
            return new Promise((resolve, reject) => {
                // Check if pattern exists
                const checkQuery = `SELECT id, occurrence_count FROM error_patterns WHERE pattern_hash = ?`;
                
                this.db.get(checkQuery, [patternHash], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (row) {
                        // Update existing pattern
                        const updateQuery = `
                            UPDATE error_patterns 
                            SET occurrence_count = occurrence_count + 1, last_seen = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `;
                        this.db.run(updateQuery, [row.id], resolve);
                    } else {
                        // Create new pattern
                        const insertQuery = `
                            INSERT INTO error_patterns (pattern_hash, error_message_pattern, category)
                            VALUES (?, ?, ?)
                        `;
                        this.db.run(insertQuery, [patternHash, error.message, category], resolve);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to track error pattern:', error);
        }
    }

    // Generate pattern hash for error grouping
    generatePatternHash(message) {
        // Remove dynamic parts like IDs, timestamps, etc.
        const normalized = message
            .replace(/\d+/g, 'NUM')
            .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
            .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL')
            .toLowerCase();
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // Send error notification
    async sendErrorNotification(errorData) {
        try {
            // Console notification (always)
            console.error(`🚨 CRITICAL ERROR: ${errorData.message}`);
            
            // Save notification record
            await this.saveNotification(errorData.error_id, 'console', 'system');
            
            // Could extend to email notifications, Slack, etc.
        } catch (error) {
            console.error('Failed to send error notification:', error);
        }
    }

    // Save notification record
    async saveNotification(errorId, type, recipient) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO error_notifications (error_id, notification_type, recipient)
                VALUES (?, ?, ?)
            `;

            this.db.run(query, [errorId, type, recipient], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get error statistics
    async getErrorStatistics(timeframe = '24h') {
        return new Promise((resolve, reject) => {
            let timeCondition = '';
            switch (timeframe) {
                case '1h':
                    timeCondition = "datetime(created_at) > datetime('now', '-1 hour')";
                    break;
                case '24h':
                    timeCondition = "datetime(created_at) > datetime('now', '-1 day')";
                    break;
                case '7d':
                    timeCondition = "datetime(created_at) > datetime('now', '-7 days')";
                    break;
                case '30d':
                    timeCondition = "datetime(created_at) > datetime('now', '-30 days')";
                    break;
                default:
                    timeCondition = "datetime(created_at) > datetime('now', '-1 day')";
            }

            const query = `
                SELECT 
                    category,
                    severity,
                    COUNT(*) as count,
                    COUNT(CASE WHEN is_resolved = 1 THEN 1 END) as resolved_count,
                    AVG(retry_count) as avg_retries
                FROM error_logs 
                WHERE ${timeCondition}
                GROUP BY category, severity
                ORDER BY count DESC
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

    // Get recent errors
    async getRecentErrors(limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT error_id, category, severity, message, endpoint, method, 
                       status_code, retry_count, is_resolved, created_at
                FROM error_logs 
                ORDER BY created_at DESC 
                LIMIT ?
            `;

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get error patterns
    async getErrorPatterns(limit = 20) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT pattern_hash, error_message_pattern, category, occurrence_count,
                       first_seen, last_seen, is_known_issue, solution
                FROM error_patterns 
                ORDER BY occurrence_count DESC, last_seen DESC
                LIMIT ?
            `;

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Mark error as resolved
    async resolveError(errorId, solution = null) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE error_logs 
                SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
                WHERE error_id = ?
            `;

            this.db.run(query, [errorId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Retry failed operation
    async retryOperation(errorId, operation) {
        try {
            // Get error details
            const errorDetails = await this.getErrorById(errorId);
            
            if (!errorDetails || errorDetails.retry_count >= errorDetails.max_retries) {
                throw new Error('Maximum retries exceeded or error not retryable');
            }

            // Increment retry count
            await this.incrementRetryCount(errorId);

            // Execute the operation
            const result = await operation();

            // Mark as resolved if successful
            await this.resolveError(errorId);

            return result;
        } catch (error) {
            // Log the retry failure
            await this.logError(error, { 
                originalErrorId: errorId,
                userAction: 'retry_operation'
            });
            throw error;
        }
    }

    // Get error by ID
    async getErrorById(errorId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM error_logs WHERE error_id = ?`;
            
            this.db.get(query, [errorId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Increment retry count
    async incrementRetryCount(errorId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE error_logs 
                SET retry_count = retry_count + 1
                WHERE error_id = ?
            `;

            this.db.run(query, [errorId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Health check
    async performHealthCheck() {
        const health = {
            database: 'healthy',
            memory: 'healthy',
            errors: 'healthy',
            overall: 'healthy'
        };

        try {
            // Check database connectivity
            await new Promise((resolve, reject) => {
                this.db.get('SELECT 1', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Check recent error rate
            const recentErrors = await this.getErrorStatistics('1h');
            const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
            
            if (criticalErrors > 5) {
                health.errors = 'critical';
                health.overall = 'critical';
            } else if (criticalErrors > 0) {
                health.errors = 'warning';
                health.overall = 'warning';
            }

            // Check memory usage
            const memUsage = process.memoryUsage();
            const memUsageMB = memUsage.heapUsed / 1024 / 1024;
            
            if (memUsageMB > 500) {
                health.memory = 'critical';
                health.overall = 'critical';
            } else if (memUsageMB > 200) {
                health.memory = 'warning';
                if (health.overall === 'healthy') health.overall = 'warning';
            }

        } catch (error) {
            health.database = 'critical';
            health.overall = 'critical';
        }

        return health;
    }
}

module.exports = new ErrorHandlingService();
