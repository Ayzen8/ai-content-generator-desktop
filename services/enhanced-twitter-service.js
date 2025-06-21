const { TwitterApi } = require('twitter-api-v2');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EnhancedTwitterService {
    constructor() {
        this.client = null;
        this.isAuthenticated = false;
        this.rateLimitInfo = {};
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initializeTwitterTables();
        
        // Rate limiting configuration
        this.rateLimits = {
            tweets: { limit: 300, window: 15 * 60 * 1000, used: 0, resetTime: 0 },
            userLookup: { limit: 300, window: 15 * 60 * 1000, used: 0, resetTime: 0 },
            follows: { limit: 50, window: 15 * 60 * 1000, used: 0, resetTime: 0 },
            likes: { limit: 75, window: 15 * 60 * 1000, used: 0, resetTime: 0 }
        };
    }

    // Initialize Twitter-related database tables
    initializeTwitterTables() {
        const createTwitterTables = `
            CREATE TABLE IF NOT EXISTS twitter_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tweet_id TEXT UNIQUE,
                content TEXT NOT NULL,
                niche_id INTEGER,
                posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                likes_count INTEGER DEFAULT 0,
                retweets_count INTEGER DEFAULT 0,
                replies_count INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0,
                is_successful BOOLEAN DEFAULT 0,
                error_message TEXT,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS twitter_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tweet_id TEXT NOT NULL,
                date DATE NOT NULL,
                likes INTEGER DEFAULT 0,
                retweets INTEGER DEFAULT 0,
                replies INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                profile_clicks INTEGER DEFAULT 0,
                url_clicks INTEGER DEFAULT 0,
                hashtag_clicks INTEGER DEFAULT 0,
                detail_expands INTEGER DEFAULT 0,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tweet_id) REFERENCES twitter_posts (tweet_id)
            );

            CREATE TABLE IF NOT EXISTS twitter_rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL,
                limit_count INTEGER NOT NULL,
                remaining INTEGER NOT NULL,
                reset_time INTEGER NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS twitter_account_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE,
                username TEXT NOT NULL,
                display_name TEXT,
                followers_count INTEGER DEFAULT 0,
                following_count INTEGER DEFAULT 0,
                tweet_count INTEGER DEFAULT 0,
                verified BOOLEAN DEFAULT 0,
                profile_image_url TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        this.db.exec(createTwitterTables, (err) => {
            if (err) {
                console.error('Error creating Twitter tables:', err);
            } else {
                console.log('✅ Twitter tables initialized');
            }
        });
    }

    // Initialize Twitter client with credentials
    async initialize(credentials) {
        try {
            if (!credentials.apiKey || !credentials.apiSecret || !credentials.accessToken || !credentials.accessTokenSecret) {
                throw new Error('Missing required Twitter API credentials');
            }

            this.client = new TwitterApi({
                appKey: credentials.apiKey,
                appSecret: credentials.apiSecret,
                accessToken: credentials.accessToken,
                accessSecret: credentials.accessTokenSecret,
            });

            // Test the connection
            const user = await this.client.v2.me();
            this.isAuthenticated = true;
            
            // Save account info
            await this.saveAccountInfo(user.data);
            
            console.log('✅ Twitter API initialized successfully');
            return { success: true, user: user.data };
        } catch (error) {
            console.error('❌ Twitter API initialization failed:', error);
            this.isAuthenticated = false;
            throw new Error(`Twitter API initialization failed: ${error.message}`);
        }
    }

    // Check rate limit before making API calls
    async checkRateLimit(endpoint) {
        const now = Date.now();
        const limit = this.rateLimits[endpoint];
        
        if (!limit) return true;

        // Reset counter if window has passed
        if (now > limit.resetTime) {
            limit.used = 0;
            limit.resetTime = now + limit.window;
        }

        // Check if we're within limits
        if (limit.used >= limit.limit) {
            const waitTime = limit.resetTime - now;
            throw new Error(`Rate limit exceeded for ${endpoint}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
        }

        return true;
    }

    // Update rate limit usage
    updateRateLimit(endpoint) {
        const limit = this.rateLimits[endpoint];
        if (limit) {
            limit.used++;
        }
    }

    // Enhanced post tweet with retry logic and analytics
    async postTweet(content, options = {}) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Twitter API not authenticated');
            }

            await this.checkRateLimit('tweets');

            // Validate content
            if (!content || content.trim().length === 0) {
                throw new Error('Tweet content cannot be empty');
            }

            if (content.length > 280) {
                throw new Error('Tweet content exceeds 280 characters');
            }

            // Post the tweet with retry logic
            let tweet;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    tweet = await this.client.v2.tweet(content, options);
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw error;
                    }
                    
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            }

            this.updateRateLimit('tweets');

            // Save to database
            await this.saveTweetToDatabase(tweet.data, content, options.nicheId);

            console.log('✅ Tweet posted successfully:', tweet.data.id);
            return {
                success: true,
                tweetId: tweet.data.id,
                text: tweet.data.text,
                url: `https://twitter.com/user/status/${tweet.data.id}`
            };

        } catch (error) {
            console.error('❌ Failed to post tweet:', error);
            
            // Save failed attempt to database
            await this.saveFailedTweet(content, error.message, options.nicheId);
            
            throw new Error(`Failed to post tweet: ${error.message}`);
        }
    }

    // Get account analytics
    async getAccountAnalytics() {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Twitter API not authenticated');
            }

            const user = await this.client.v2.me({
                'user.fields': ['public_metrics', 'verified', 'profile_image_url']
            });

            const analytics = {
                user_id: user.data.id,
                username: user.data.username,
                display_name: user.data.name,
                followers_count: user.data.public_metrics.followers_count,
                following_count: user.data.public_metrics.following_count,
                tweet_count: user.data.public_metrics.tweet_count,
                listed_count: user.data.public_metrics.listed_count,
                verified: user.data.verified || false,
                profile_image_url: user.data.profile_image_url
            };

            // Update account info in database
            await this.updateAccountInfo(analytics);

            return analytics;
        } catch (error) {
            console.error('❌ Failed to get account analytics:', error);
            throw new Error(`Failed to get account analytics: ${error.message}`);
        }
    }

    // Get tweet analytics
    async getTweetAnalytics(tweetId) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Twitter API not authenticated');
            }

            const tweet = await this.client.v2.singleTweet(tweetId, {
                'tweet.fields': ['public_metrics', 'created_at', 'context_annotations']
            });

            const analytics = {
                tweet_id: tweetId,
                likes: tweet.data.public_metrics.like_count,
                retweets: tweet.data.public_metrics.retweet_count,
                replies: tweet.data.public_metrics.reply_count,
                quotes: tweet.data.public_metrics.quote_count,
                impressions: tweet.data.public_metrics.impression_count || 0,
                created_at: tweet.data.created_at
            };

            // Save analytics to database
            await this.saveTweetAnalytics(analytics);

            return analytics;
        } catch (error) {
            console.error('❌ Failed to get tweet analytics:', error);
            throw new Error(`Failed to get tweet analytics: ${error.message}`);
        }
    }

    // Get posting history with analytics
    async getPostingHistory(limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT tp.*, n.name as niche_name,
                       AVG(ta.likes) as avg_likes,
                       AVG(ta.retweets) as avg_retweets,
                       AVG(ta.replies) as avg_replies,
                       MAX(ta.impressions) as max_impressions
                FROM twitter_posts tp
                LEFT JOIN niches n ON tp.niche_id = n.id
                LEFT JOIN twitter_analytics ta ON tp.tweet_id = ta.tweet_id
                GROUP BY tp.id
                ORDER BY tp.posted_at DESC
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

    // Save tweet to database
    async saveTweetToDatabase(tweetData, content, nicheId) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO twitter_posts (tweet_id, content, niche_id, likes_count, retweets_count, replies_count)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                tweetData.id,
                content,
                nicheId || null,
                0, 0, 0 // Initial counts
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Save failed tweet attempt
    async saveFailedTweet(content, errorMessage, nicheId) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO twitter_posts (content, niche_id, error_message, is_successful)
                VALUES (?, ?, ?, 0)
            `;

            this.db.run(query, [content, nicheId || null, errorMessage], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Save account info
    async saveAccountInfo(userData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO twitter_account_info 
                (user_id, username, display_name, followers_count, following_count, tweet_count, verified, profile_image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                userData.id,
                userData.username,
                userData.name,
                userData.public_metrics?.followers_count || 0,
                userData.public_metrics?.following_count || 0,
                userData.public_metrics?.tweet_count || 0,
                userData.verified || false,
                userData.profile_image_url || null
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Update account info
    async updateAccountInfo(analytics) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE twitter_account_info 
                SET followers_count = ?, following_count = ?, tweet_count = ?, 
                    verified = ?, profile_image_url = ?, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;

            this.db.run(query, [
                analytics.followers_count,
                analytics.following_count,
                analytics.tweet_count,
                analytics.verified,
                analytics.profile_image_url,
                analytics.user_id
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Save tweet analytics
    async saveTweetAnalytics(analytics) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO twitter_analytics 
                (tweet_id, date, likes, retweets, replies, impressions)
                VALUES (?, DATE('now'), ?, ?, ?, ?)
            `;

            this.db.run(query, [
                analytics.tweet_id,
                analytics.likes,
                analytics.retweets,
                analytics.replies,
                analytics.impressions
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get rate limit status
    getRateLimitStatus() {
        const status = {};
        const now = Date.now();

        Object.entries(this.rateLimits).forEach(([endpoint, limit]) => {
            const remaining = Math.max(0, limit.limit - limit.used);
            const resetIn = Math.max(0, limit.resetTime - now);
            
            status[endpoint] = {
                limit: limit.limit,
                used: limit.used,
                remaining,
                resetIn: Math.ceil(resetIn / 1000),
                percentage: Math.round((remaining / limit.limit) * 100)
            };
        });

        return status;
    }

    // Check connection status
    async checkConnection() {
        try {
            if (!this.client) {
                return { connected: false, error: 'Client not initialized' };
            }

            const user = await this.client.v2.me();
            return { 
                connected: true, 
                user: user.data,
                rateLimits: this.getRateLimitStatus()
            };
        } catch (error) {
            return { 
                connected: false, 
                error: error.message,
                rateLimits: this.getRateLimitStatus()
            };
        }
    }
}

module.exports = new EnhancedTwitterService();
