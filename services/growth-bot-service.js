const { TwitterApi } = require('twitter-api-v2');
const geminiService = require('./gemini-service');

class GrowthBotService {
    constructor() {
        this.twitterClient = null;
        this.isRunning = false;
        this.config = {
            maxFollowsPerHour: 15,
            maxLikesPerHour: 30,
            maxCommentsPerHour: 10,
            maxRetweetsPerHour: 20,
            engagementDelay: 60000, // 1 minute between actions
            targetNiches: [],
            blacklistedUsers: [],
            followBackCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
        };
        this.stats = {
            followsToday: 0,
            likesToday: 0,
            commentsToday: 0,
            retweetsToday: 0,
            followersGained: 0,
            lastReset: new Date().toDateString()
        };
        this.actionQueue = [];
        this.isProcessing = false;
    }

    // Initialize Twitter client with user credentials
    async initialize(accessToken, accessSecret, apiKey, apiSecret) {
        try {
            this.twitterClient = new TwitterApi({
                appKey: apiKey,
                appSecret: apiSecret,
                accessToken: accessToken,
                accessSecret: accessSecret,
            });

            // Verify credentials
            await this.twitterClient.v2.me();
            console.log('✅ Growth Bot initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Growth Bot initialization failed:', error);
            throw new Error(`Failed to initialize Growth Bot: ${error.message}`);
        }
    }

    // Start the growth bot
    async start(targetNiches = []) {
        if (this.isRunning) {
            throw new Error('Growth Bot is already running');
        }

        if (!this.twitterClient) {
            throw new Error('Growth Bot not initialized. Please set up Twitter credentials first.');
        }

        this.config.targetNiches = targetNiches;
        this.isRunning = true;
        this.resetDailyStats();

        console.log('🚀 Growth Bot started with target niches:', targetNiches);
        
        // Start the main bot loop
        this.startBotLoop();
        
        return {
            status: 'started',
            targetNiches: this.config.targetNiches,
            config: this.config
        };
    }

    // Stop the growth bot
    stop() {
        this.isRunning = false;
        this.actionQueue = [];
        console.log('⏹️ Growth Bot stopped');
        
        return {
            status: 'stopped',
            finalStats: this.stats
        };
    }

    // Main bot loop
    async startBotLoop() {
        while (this.isRunning) {
            try {
                await this.processActionQueue();
                await this.findAndEngageContent();
                await this.checkFollowBacks();
                
                // Wait before next cycle
                await this.sleep(this.config.engagementDelay);
            } catch (error) {
                console.error('Growth Bot error:', error);
                await this.sleep(5000); // Wait 5 seconds on error
            }
        }
    }

    // Find and engage with relevant content
    async findAndEngageContent() {
        if (!this.canPerformActions()) return;

        try {
            // Search for tweets in target niches
            const searchQueries = this.buildSearchQueries();
            
            for (const query of searchQueries) {
                const tweets = await this.searchTweets(query);
                
                for (const tweet of tweets.slice(0, 5)) { // Limit to 5 tweets per query
                    await this.evaluateAndEngageTweet(tweet);
                    
                    if (!this.canPerformActions()) break;
                }
                
                if (!this.canPerformActions()) break;
            }
        } catch (error) {
            console.error('Error finding content:', error);
        }
    }

    // Build search queries based on target niches
    buildSearchQueries() {
        const queries = [];
        
        for (const niche of this.config.targetNiches) {
            // Create search queries for each niche
            const keywords = niche.keywords ? niche.keywords.split(',').map(k => k.trim()) : [];
            
            if (keywords.length > 0) {
                // Use top 3 keywords for search
                const topKeywords = keywords.slice(0, 3);
                queries.push(topKeywords.join(' OR '));
            }
        }
        
        return queries.length > 0 ? queries : ['content creation', 'social media marketing'];
    }

    // Search for tweets
    async searchTweets(query) {
        try {
            const response = await this.twitterClient.v2.search(query, {
                max_results: 10,
                'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'context_annotations'],
                'user.fields': ['public_metrics', 'verified'],
                expansions: ['author_id']
            });

            return response.data || [];
        } catch (error) {
            console.error('Error searching tweets:', error);
            return [];
        }
    }

    // Evaluate and engage with a tweet
    async evaluateAndEngageTweet(tweet) {
        try {
            // Skip if tweet is too old (more than 24 hours)
            const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
            if (tweetAge > 24 * 60 * 60 * 1000) return;

            // Skip if tweet has too many likes (likely viral, hard to get noticed)
            if (tweet.public_metrics?.like_count > 1000) return;

            // Skip if tweet has very few likes (might be low quality)
            if (tweet.public_metrics?.like_count < 2) return;

            // Calculate engagement score
            const engagementScore = this.calculateEngagementScore(tweet);
            
            if (engagementScore > 0.6) {
                // High engagement - like and potentially comment
                await this.likeTweet(tweet.id);
                
                if (engagementScore > 0.8 && this.stats.commentsToday < this.config.maxCommentsPerHour) {
                    await this.generateAndPostComment(tweet);
                }
                
                // Consider following the author if they're in our niche
                if (engagementScore > 0.9 && this.stats.followsToday < this.config.maxFollowsPerHour) {
                    await this.followUser(tweet.author_id);
                }
            } else if (engagementScore > 0.4) {
                // Medium engagement - just like
                await this.likeTweet(tweet.id);
            }
            
        } catch (error) {
            console.error('Error evaluating tweet:', error);
        }
    }

    // Calculate engagement score for a tweet
    calculateEngagementScore(tweet) {
        const metrics = tweet.public_metrics || {};
        const likes = metrics.like_count || 0;
        const retweets = metrics.retweet_count || 0;
        const replies = metrics.reply_count || 0;
        
        // Simple engagement scoring algorithm
        const totalEngagement = likes + (retweets * 2) + (replies * 3);
        const ageHours = (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60);
        
        // Normalize by age (newer tweets get higher scores)
        const ageMultiplier = Math.max(0.1, 1 - (ageHours / 24));
        
        // Score between 0 and 1
        return Math.min(1, (totalEngagement * ageMultiplier) / 100);
    }

    // Generate and post AI comment
    async generateAndPostComment(tweet) {
        try {
            if (this.stats.commentsToday >= this.config.maxCommentsPerHour) return;

            // Generate contextual comment using AI
            const comment = await this.generateSmartComment(tweet.text);
            
            if (comment && comment.length > 0 && comment.length <= 280) {
                await this.twitterClient.v2.reply(comment, tweet.id);
                this.stats.commentsToday++;
                
                console.log(`💬 Posted comment: "${comment.substring(0, 50)}..."`);
                
                // Add delay after commenting
                await this.sleep(2000);
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    }

    // Generate smart AI comment
    async generateSmartComment(tweetText) {
        try {
            const prompt = `
Generate a helpful, engaging reply to this tweet: "${tweetText}"

Requirements:
- Be genuinely helpful and add value
- Keep it under 280 characters
- Sound natural and conversational
- Don't be promotional or spammy
- Ask a thoughtful question or share a relevant insight
- Match the tone of the original tweet

Reply:`;

            const response = await geminiService.generateContent({
                name: 'Smart Comment',
                description: 'Generate contextual social media comments',
                persona: 'Helpful and engaging social media user',
                keywords: 'engagement, conversation, value'
            }, 'comment');

            // Extract just the comment text
            return response.comment || response.tweet || '';
        } catch (error) {
            console.error('Error generating comment:', error);
            return '';
        }
    }

    // Like a tweet
    async likeTweet(tweetId) {
        try {
            if (this.stats.likesToday >= this.config.maxLikesPerHour) return;

            await this.twitterClient.v2.like(await this.getMyUserId(), tweetId);
            this.stats.likesToday++;
            
            console.log(`❤️ Liked tweet: ${tweetId}`);
            await this.sleep(1000);
        } catch (error) {
            console.error('Error liking tweet:', error);
        }
    }

    // Follow a user
    async followUser(userId) {
        try {
            if (this.stats.followsToday >= this.config.maxFollowsPerHour) return;
            if (this.config.blacklistedUsers.includes(userId)) return;

            await this.twitterClient.v2.follow(await this.getMyUserId(), userId);
            this.stats.followsToday++;
            
            console.log(`👥 Followed user: ${userId}`);
            await this.sleep(2000);
        } catch (error) {
            console.error('Error following user:', error);
        }
    }

    // Get current user ID
    async getMyUserId() {
        if (!this.myUserId) {
            const me = await this.twitterClient.v2.me();
            this.myUserId = me.data.id;
        }
        return this.myUserId;
    }

    // Check if we can perform more actions today
    canPerformActions() {
        this.resetDailyStatsIfNeeded();
        
        return this.stats.followsToday < this.config.maxFollowsPerHour &&
               this.stats.likesToday < this.config.maxLikesPerHour &&
               this.stats.commentsToday < this.config.maxCommentsPerHour;
    }

    // Reset daily stats if it's a new day
    resetDailyStatsIfNeeded() {
        const today = new Date().toDateString();
        if (this.stats.lastReset !== today) {
            this.resetDailyStats();
        }
    }

    // Reset daily statistics
    resetDailyStats() {
        const today = new Date().toDateString();
        this.stats = {
            ...this.stats,
            followsToday: 0,
            likesToday: 0,
            commentsToday: 0,
            retweetsToday: 0,
            lastReset: today
        };
    }

    // Check for follow backs and unfollow non-followers
    async checkFollowBacks() {
        // Implementation for follow-back checking
        // This would be called less frequently (daily)
    }

    // Process action queue
    async processActionQueue() {
        if (this.isProcessing || this.actionQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.actionQueue.length > 0 && this.canPerformActions()) {
            const action = this.actionQueue.shift();
            await this.executeAction(action);
        }
        
        this.isProcessing = false;
    }

    // Execute a queued action
    async executeAction(action) {
        try {
            switch (action.type) {
                case 'like':
                    await this.likeTweet(action.tweetId);
                    break;
                case 'follow':
                    await this.followUser(action.userId);
                    break;
                case 'comment':
                    await this.generateAndPostComment(action.tweet);
                    break;
            }
        } catch (error) {
            console.error('Error executing action:', error);
        }
    }

    // Get current statistics
    getStats() {
        this.resetDailyStatsIfNeeded();
        return {
            ...this.stats,
            isRunning: this.isRunning,
            config: this.config,
            queueLength: this.actionQueue.length
        };
    }

    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this.config;
    }

    // Utility function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new GrowthBotService();
