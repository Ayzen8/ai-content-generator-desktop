const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');

class TwitterService {
    constructor() {
        this.client = null;
        this.rateLimits = {
            posts: {
                daily: 50,
                monthly: 300,
                current: 0,
                lastReset: new Date()
            }
        };
        this.initializeClient();
    }

    initializeClient() {
        try {
            // Initialize with app-only authentication for basic operations
            if (process.env.TWITTER_BEARER_TOKEN) {
                this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
            }
        } catch (error) {
            console.error('Error initializing Twitter client:', error);
        }
    }

    // Get OAuth 2.0 authorization URL
    async getAuthUrl(callbackUrl = 'http://localhost:3000/auth/twitter/callback') {
        try {
            if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
                throw new Error('Twitter API credentials not configured');
            }

            const client = new TwitterApi({
                clientId: process.env.TWITTER_CLIENT_ID,
                clientSecret: process.env.TWITTER_CLIENT_SECRET,
            });

            const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
                callbackUrl,
                { 
                    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] 
                }
            );

            return {
                url,
                codeVerifier,
                state
            };
        } catch (error) {
            console.error('Error generating auth URL:', error);
            throw error;
        }
    }

    // Handle OAuth callback and get access token
    async handleCallback(code, codeVerifier, callbackUrl) {
        try {
            const client = new TwitterApi({
                clientId: process.env.TWITTER_CLIENT_ID,
                clientSecret: process.env.TWITTER_CLIENT_SECRET,
            });

            const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
                code,
                codeVerifier,
                redirectUri: callbackUrl,
            });

            // Get user info
            const userClient = new TwitterApi(accessToken);
            const user = await userClient.v2.me();

            return {
                accessToken,
                refreshToken,
                expiresIn,
                user: user.data
            };
        } catch (error) {
            console.error('Error handling OAuth callback:', error);
            throw error;
        }
    }

    // Post a tweet
    async postTweet(content, accessToken) {
        try {
            if (!accessToken) {
                throw new Error('Access token required for posting');
            }

            // Check rate limits
            if (!this.checkRateLimit()) {
                throw new Error(`Rate limit exceeded. Daily limit: ${this.rateLimits.posts.daily} posts`);
            }

            // Validate content length
            if (content.length > 280) {
                throw new Error('Tweet content exceeds 280 character limit');
            }

            const userClient = new TwitterApi(accessToken);
            const tweet = await userClient.v2.tweet(content);

            // Update rate limit counter
            this.updateRateLimit();

            return {
                success: true,
                tweetId: tweet.data.id,
                text: tweet.data.text
            };
        } catch (error) {
            console.error('Error posting tweet:', error);
            throw error;
        }
    }

    // Check if we're within rate limits
    checkRateLimit() {
        const now = new Date();
        const lastReset = new Date(this.rateLimits.posts.lastReset);
        
        // Reset daily counter if it's a new day
        if (now.getDate() !== lastReset.getDate()) {
            this.rateLimits.posts.current = 0;
            this.rateLimits.posts.lastReset = now;
        }

        return this.rateLimits.posts.current < this.rateLimits.posts.daily;
    }

    // Update rate limit counter
    updateRateLimit() {
        this.rateLimits.posts.current++;
    }

    // Get current rate limit status
    getRateLimitStatus() {
        const now = new Date();
        const lastReset = new Date(this.rateLimits.posts.lastReset);
        
        // Reset daily counter if it's a new day
        if (now.getDate() !== lastReset.getDate()) {
            this.rateLimits.posts.current = 0;
            this.rateLimits.posts.lastReset = now;
        }

        return {
            daily: {
                limit: this.rateLimits.posts.daily,
                used: this.rateLimits.posts.current,
                remaining: this.rateLimits.posts.daily - this.rateLimits.posts.current
            },
            monthly: {
                limit: this.rateLimits.posts.monthly,
                // Note: Monthly tracking would need database storage for persistence
                used: 0,
                remaining: this.rateLimits.posts.monthly
            }
        };
    }

    // Test connection with current credentials
    async testConnection(accessToken = null) {
        try {
            let client;
            
            if (accessToken) {
                client = new TwitterApi(accessToken);
                const user = await client.v2.me();
                return {
                    success: true,
                    message: 'Twitter API connection successful',
                    user: user.data
                };
            } else if (process.env.TWITTER_BEARER_TOKEN) {
                client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
                // Test with a simple API call
                const response = await client.v2.userByUsername('twitter');
                return {
                    success: true,
                    message: 'Twitter API connection successful (app-only)',
                    data: response.data
                };
            } else {
                throw new Error('No Twitter API credentials available');
            }
        } catch (error) {
            console.error('Twitter connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Encrypt access token for storage
    encryptToken(token) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.TWITTER_CLIENT_SECRET || 'default-key', 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt access token from storage
    decryptToken(encryptedToken) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.TWITTER_CLIENT_SECRET || 'default-key', 'salt', 32);
        
        const textParts = encryptedToken.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = textParts.join(':');
        
        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Get user's Twitter profile
    async getUserProfile(accessToken) {
        try {
            const userClient = new TwitterApi(accessToken);
            const user = await userClient.v2.me({
                'user.fields': ['profile_image_url', 'public_metrics', 'verified']
            });
            
            return {
                success: true,
                user: user.data
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Validate tweet content before posting
    validateTweetContent(content) {
        const errors = [];
        
        if (!content || content.trim().length === 0) {
            errors.push('Tweet content cannot be empty');
        }
        
        if (content.length > 280) {
            errors.push(`Tweet exceeds 280 character limit (${content.length} characters)`);
        }
        
        // Check for potentially problematic content
        const suspiciousPatterns = [
            /(.)\1{10,}/g, // Repeated characters
            /^[A-Z\s!]{20,}$/g, // All caps
        ];
        
        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                errors.push('Tweet content may be flagged as spam');
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            characterCount: content.length,
            remainingCharacters: 280 - content.length
        };
    }
}

module.exports = new TwitterService();
