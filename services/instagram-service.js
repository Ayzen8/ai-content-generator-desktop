const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

class InstagramService {
    constructor() {
        this.baseURL = 'https://graph.instagram.com';
        this.authURL = 'https://api.instagram.com/oauth/authorize';
        this.tokenURL = 'https://api.instagram.com/oauth/access_token';
        this.rateLimits = {
            posts: {
                daily: 25, // Instagram Basic Display API limit
                current: 0,
                lastReset: new Date()
            }
        };
    }

    // Get Instagram OAuth authorization URL
    getAuthUrl(callbackUrl = 'http://localhost:3000/auth/instagram/callback') {
        try {
            if (!process.env.INSTAGRAM_CLIENT_ID) {
                throw new Error('Instagram Client ID not configured');
            }

            const params = new URLSearchParams({
                client_id: process.env.INSTAGRAM_CLIENT_ID,
                redirect_uri: callbackUrl,
                scope: 'user_profile,user_media',
                response_type: 'code'
            });

            const authUrl = `${this.authURL}?${params.toString()}`;
            
            return {
                url: authUrl,
                state: crypto.randomBytes(16).toString('hex')
            };
        } catch (error) {
            console.error('Error generating Instagram auth URL:', error);
            throw error;
        }
    }

    // Handle OAuth callback and get access token
    async handleCallback(code, callbackUrl) {
        try {
            const formData = new FormData();
            formData.append('client_id', process.env.INSTAGRAM_CLIENT_ID);
            formData.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET);
            formData.append('grant_type', 'authorization_code');
            formData.append('redirect_uri', callbackUrl);
            formData.append('code', code);

            const response = await axios.post(this.tokenURL, formData, {
                headers: formData.getHeaders()
            });

            const { access_token, user_id } = response.data;

            // Get user info
            const userResponse = await axios.get(`${this.baseURL}/me`, {
                params: {
                    fields: 'id,username,account_type',
                    access_token: access_token
                }
            });

            return {
                accessToken: access_token,
                userId: user_id,
                user: userResponse.data
            };
        } catch (error) {
            console.error('Error handling Instagram OAuth callback:', error);
            throw error;
        }
    }

    // Post to Instagram (text-only posts are not supported, need media)
    async postToInstagram(caption, mediaUrl, accessToken) {
        try {
            if (!accessToken) {
                throw new Error('Access token required for posting');
            }

            // Check rate limits
            if (!this.checkRateLimit()) {
                throw new Error(`Rate limit exceeded. Daily limit: ${this.rateLimits.posts.daily} posts`);
            }

            // Note: Instagram Basic Display API doesn't support posting
            // This would require Instagram Graph API (business accounts)
            throw new Error('Instagram posting requires Instagram Graph API (business account). Basic Display API only supports reading data.');

        } catch (error) {
            console.error('Error posting to Instagram:', error);
            throw error;
        }
    }

    // Get user's Instagram media (for display purposes)
    async getUserMedia(accessToken, limit = 10) {
        try {
            const response = await axios.get(`${this.baseURL}/me/media`, {
                params: {
                    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
                    limit: limit,
                    access_token: accessToken
                }
            });

            return {
                success: true,
                media: response.data.data
            };
        } catch (error) {
            console.error('Error getting Instagram media:', error);
            return {
                success: false,
                error: error.message
            };
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
            }
        };
    }

    // Test connection with current credentials
    async testConnection(accessToken = null) {
        try {
            if (!accessToken) {
                // Test app credentials
                if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
                    throw new Error('Instagram API credentials not configured');
                }
                
                return {
                    success: true,
                    message: 'Instagram API credentials configured (app-only test)',
                    note: 'User authentication required for full functionality'
                };
            } else {
                // Test user access token
                const response = await axios.get(`${this.baseURL}/me`, {
                    params: {
                        fields: 'id,username,account_type',
                        access_token: accessToken
                    }
                });
                
                return {
                    success: true,
                    message: 'Instagram API connection successful',
                    user: response.data
                };
            }
        } catch (error) {
            console.error('Instagram connection test failed:', error);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // Encrypt access token for storage
    encryptToken(token) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.INSTAGRAM_CLIENT_SECRET || 'default-key', 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt access token from storage
    decryptToken(encryptedToken) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.INSTAGRAM_CLIENT_SECRET || 'default-key', 'salt', 32);
        
        const textParts = encryptedToken.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = textParts.join(':');
        
        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Get user's Instagram profile
    async getUserProfile(accessToken) {
        try {
            const response = await axios.get(`${this.baseURL}/me`, {
                params: {
                    fields: 'id,username,account_type,media_count',
                    access_token: accessToken
                }
            });
            
            return {
                success: true,
                user: response.data
            };
        } catch (error) {
            console.error('Error getting Instagram user profile:', error);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // Validate Instagram caption
    validateCaption(caption) {
        const errors = [];
        
        if (!caption || caption.trim().length === 0) {
            errors.push('Instagram caption cannot be empty');
        }
        
        if (caption.length > 2200) {
            errors.push(`Caption exceeds 2200 character limit (${caption.length} characters)`);
        }
        
        // Count hashtags
        const hashtags = caption.match(/#\w+/g) || [];
        if (hashtags.length > 30) {
            errors.push(`Too many hashtags (${hashtags.length}/30 max)`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            characterCount: caption.length,
            hashtagCount: hashtags.length
        };
    }
}

module.exports = new InstagramService();
