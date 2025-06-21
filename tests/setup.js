// Test setup and configuration
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.TEST_DB_PATH = path.join(__dirname, 'test.db');

// Global test utilities
global.testUtils = {
    // Create test database
    async createTestDatabase() {
        const testDbPath = process.env.TEST_DB_PATH;
        
        // Remove existing test database
        try {
            await fs.unlink(testDbPath);
        } catch (error) {
            // File doesn't exist, that's fine
        }
        
        // Create new test database
        const db = new sqlite3.Database(testDbPath);
        
        // Initialize basic tables for testing
        const initSQL = `
            CREATE TABLE IF NOT EXISTS content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                niche_id INTEGER NOT NULL,
                x_post TEXT NOT NULL,
                instagram_caption TEXT NOT NULL,
                hashtags TEXT NOT NULL,
                image_prompt TEXT NOT NULL,
                quality_score REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS niches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT NOT NULL,
                persona TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                date DATE NOT NULL,
                niche_id INTEGER,
                platform TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS twitter_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER NOT NULL,
                niche_id INTEGER NOT NULL,
                post_text TEXT NOT NULL,
                is_successful BOOLEAN DEFAULT 0,
                posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (content_id) REFERENCES content (id),
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                stack_trace TEXT,
                context TEXT,
                is_resolved BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS content_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                name TEXT NOT NULL,
                template TEXT NOT NULL,
                variables TEXT,
                is_public BOOLEAN DEFAULT 1,
                usage_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS hashtag_research (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hashtag TEXT NOT NULL,
                category TEXT NOT NULL,
                niche_id INTEGER,
                popularity_score REAL DEFAULT 0,
                is_banned BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        return new Promise((resolve, reject) => {
            db.exec(initSQL, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(db);
                }
            });
        });
    },

    // Clean test database
    async cleanTestDatabase() {
        const testDbPath = process.env.TEST_DB_PATH;
        try {
            await fs.unlink(testDbPath);
        } catch (error) {
            // File doesn't exist, that's fine
        }
    },

    // Insert test data
    async insertTestData(db, table, data) {
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(data);
        
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        return new Promise((resolve, reject) => {
            db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    },

    // Generate test content
    generateTestContent(nicheId = 1) {
        return {
            niche_id: nicheId,
            x_post: 'Test X post content for testing purposes #test',
            instagram_caption: 'Test Instagram caption with engaging content',
            hashtags: '#test #automation #ai #content',
            image_prompt: 'A test image showing modern technology and AI',
            quality_score: 0.85
        };
    },

    // Generate test niche
    generateTestNiche(name = 'Test Niche') {
        return {
            name,
            description: 'A test niche for automated testing purposes',
            persona: JSON.stringify({
                tone: 'professional',
                style: 'informative',
                target_audience: 'tech enthusiasts',
                expertise_level: 'intermediate'
            })
        };
    },

    // Generate test analytics data
    generateTestAnalytics(metricName = 'engagement_rate', value = 0.05) {
        return {
            metric_name: metricName,
            metric_value: value,
            date: new Date().toISOString().split('T')[0],
            niche_id: 1,
            platform: 'twitter'
        };
    },

    // Wait for async operations
    async wait(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Mock API responses
    mockApiResponse(data, status = 200) {
        return {
            status,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data))
        };
    },

    // Generate random test data
    randomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    randomNumber(min = 0, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomBoolean() {
        return Math.random() < 0.5;
    },

    // Performance testing utilities
    async measurePerformance(fn, iterations = 1) {
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime.bigint();
            await fn();
            const endTime = process.hrtime.bigint();
            
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            results.push(duration);
        }
        
        return {
            iterations,
            results,
            average: results.reduce((sum, time) => sum + time, 0) / results.length,
            min: Math.min(...results),
            max: Math.max(...results),
            total: results.reduce((sum, time) => sum + time, 0)
        };
    },

    // Memory usage testing
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100 // MB
        };
    },

    // Test data validation
    validateTestData(data, schema) {
        const errors = [];
        
        for (const [key, rules] of Object.entries(schema)) {
            const value = data[key];
            
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                continue;
            }
            
            if (value !== undefined && value !== null) {
                if (rules.type && typeof value !== rules.type) {
                    errors.push(`${key} must be of type ${rules.type}`);
                }
                
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${key} must be at least ${rules.minLength} characters`);
                }
                
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${key} must be no more than ${rules.maxLength} characters`);
                }
                
                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${key} does not match required pattern`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

// Global test hooks - only define if mocha is available
if (typeof beforeEach !== 'undefined') {
    beforeEach(async function() {
        // Set longer timeout for database operations
        this.timeout(10000);
    });

    afterEach(async function() {
        // Clean up after each test
        await global.testUtils.wait(50);
    });
}

// Export for use in test files
module.exports = global.testUtils;
