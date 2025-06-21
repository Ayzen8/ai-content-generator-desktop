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
            // Advanced targeting settings
            minFollowerCount: 50, // Avoid bots
            maxFollowerCount: 50000, // Avoid mega-influencers
            minEngagementRate: 0.02, // 2% minimum engagement
            targetLanguages: ['en'], // English content only
            avoidVerifiedAccounts: false, // Can engage with verified accounts
            prioritizeQuestions: true, // Prioritize question tweets
            focusOnRecent: true, // Focus on tweets from last 6 hours
            // Human-like posting settings
            enableHumanPosts: true, // Enable human-like posting
            maxHumanPostsPerDay: 3, // 1-3 posts per day like a real person
            humanPostingHours: [9, 12, 15, 18, 21], // Optimal posting times
            humanPostTypes: ['insight', 'question', 'tip', 'observation', 'motivation']
        };
        this.stats = {
            followsToday: 0,
            likesToday: 0,
            commentsToday: 0,
            retweetsToday: 0,
            followersGained: 0,
            lastReset: new Date().toDateString(),
            humanPostsToday: 0
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

    // Main bot loop with intelligent timing
    async startBotLoop() {
        while (this.isRunning) {
            try {
                // Check if it's a good time to engage (avoid late night/early morning)
                if (this.isOptimalEngagementTime()) {
                    await this.processActionQueue();
                    await this.findAndEngageContent();
                    await this.checkFollowBacks();
                    await this.performStrategicActions();
                } else {
                    console.log('⏰ Outside optimal engagement hours, reducing activity');
                    await this.sleep(30 * 60 * 1000); // Wait 30 minutes during off-hours
                    continue;
                }

                // Dynamic delay based on current activity and success rate
                const dynamicDelay = this.calculateDynamicDelay();
                await this.sleep(dynamicDelay);
            } catch (error) {
                console.error('Growth Bot error:', error);
                await this.sleep(5000); // Wait 5 seconds on error
            }
        }
    }

    // Check if current time is optimal for engagement
    isOptimalEngagementTime() {
        const now = new Date();
        const hour = now.getHours();

        // Optimal times: 9AM-11AM, 1PM-3PM, 7PM-9PM (local time)
        const optimalHours = [9, 10, 13, 14, 19, 20];
        const goodHours = [8, 11, 12, 15, 16, 17, 18, 21];

        if (optimalHours.includes(hour)) return true;
        if (goodHours.includes(hour)) return Math.random() > 0.3; // 70% chance during good hours

        return Math.random() > 0.8; // 20% chance during off-hours
    }

    // Calculate dynamic delay based on performance
    calculateDynamicDelay() {
        const baseDelay = this.config.engagementDelay;
        const recentSuccessRate = this.calculateRecentSuccessRate();

        // Adjust delay based on success rate
        if (recentSuccessRate > 0.8) {
            return baseDelay * 0.8; // Speed up if doing well
        } else if (recentSuccessRate < 0.3) {
            return baseDelay * 1.5; // Slow down if not performing well
        }

        return baseDelay;
    }

    // Calculate recent success rate (simplified)
    calculateRecentSuccessRate() {
        // In a full implementation, this would track actual engagement responses
        // For now, return a moderate success rate
        return 0.6;
    }

    // Perform strategic actions beyond basic engagement
    async performStrategicActions() {
        try {
            // Engage with trending topics in our niches
            await this.engageWithTrendingContent();

            // Interact with influencers in our space (sparingly)
            await this.engageWithInfluencers();

            // Clean up old follows that didn't follow back
            await this.cleanupOldFollows();

            // Post human-like content occasionally
            await this.postHumanLikeContent();
        } catch (error) {
            console.error('Error in strategic actions:', error);
        }
    }

    // Engage with trending content in our niches
    async engageWithTrendingContent() {
        if (this.stats.likesToday >= this.config.maxLikesPerHour * 0.8) return;

        try {
            // Search for trending hashtags in our niches
            const trendingQueries = this.buildTrendingQueries();

            for (const query of trendingQueries.slice(0, 2)) { // Limit to 2 trending searches
                const tweets = await this.searchTweets(query + ' -is:retweet min_faves:10');

                for (const tweet of tweets.slice(0, 3)) { // Top 3 trending tweets
                    if (this.isRecentTweet(tweet) && this.hasGoodEngagement(tweet)) {
                        await this.likeTweet(tweet.id);
                        await this.sleep(2000);
                        break; // One trending engagement per query
                    }
                }
            }
        } catch (error) {
            console.error('Error engaging with trending content:', error);
        }
    }

    // Build trending-focused search queries
    buildTrendingQueries() {
        const queries = [];
        const currentHour = new Date().getHours();

        // Time-based trending topics
        if (currentHour >= 9 && currentHour <= 17) {
            queries.push('#MondayMotivation', '#TuesdayTips', '#WednesdayWisdom', '#ThrowbackThursday', '#FridayFeeling');
        } else {
            queries.push('#EveningThoughts', '#NightOwl', '#LateNightIdeas');
        }

        // Add niche-specific trending terms
        for (const niche of this.config.targetNiches) {
            if (niche.keywords) {
                const keywords = niche.keywords.split(',').map(k => k.trim());
                queries.push(`#${keywords[0].replace(/\s+/g, '')}Tips`);
            }
        }

        return queries;
    }

    // Check if tweet is recent (within focus timeframe)
    isRecentTweet(tweet) {
        if (!this.config.focusOnRecent) return true;

        const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
        return tweetAge <= 6 * 60 * 60 * 1000; // 6 hours
    }

    // Check if tweet has good engagement potential
    hasGoodEngagement(tweet) {
        const metrics = tweet.public_metrics;
        if (!metrics) return false;

        const likes = metrics.like_count || 0;
        const retweets = metrics.retweet_count || 0;
        const replies = metrics.reply_count || 0;

        // Good engagement: at least 5 likes or 2 retweets/replies
        return likes >= 5 || retweets >= 2 || replies >= 2;
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
                // Strategy 1: Hashtag-based search (higher engagement)
                const hashtagQuery = keywords.slice(0, 2).map(k => `#${k.replace(/\s+/g, '')}`).join(' OR ');
                queries.push(hashtagQuery);

                // Strategy 2: Question-based search (engagement opportunities)
                const questionQuery = `(${keywords.slice(0, 2).join(' OR ')}) (how OR what OR why OR tips)`;
                queries.push(questionQuery);

                // Strategy 3: Problem-solving search (value-add opportunities)
                const problemQuery = `(${keywords.slice(0, 2).join(' OR ')}) (help OR advice OR struggling OR confused)`;
                queries.push(problemQuery);
            }
        }

        return queries.length > 0 ? queries : ['#contentcreation', '#socialmedia', 'content creation tips'];
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
            if (tweet.public_metrics?.like_count > 500) return;

            // Skip if tweet has very few likes (might be low quality) - but allow fresh tweets
            if (tweet.public_metrics?.like_count < 1 && tweetAge > 2 * 60 * 60 * 1000) return;

            // Evaluate user profile for follow potential
            const userScore = await this.evaluateUserProfile(tweet.author_id);

            // Calculate engagement score
            const engagementScore = this.calculateEngagementScore(tweet);

            // Enhanced engagement strategy
            if (engagementScore > 0.7) {
                // High engagement - like and potentially comment
                await this.likeTweet(tweet.id);

                // Comment on high-value tweets or questions
                if ((engagementScore > 0.8 || this.isQuestion(tweet.text)) &&
                    this.stats.commentsToday < this.config.maxCommentsPerHour) {
                    await this.generateAndPostComment(tweet);
                }

                // Follow high-quality users in our niche
                if (userScore > 0.7 && this.stats.followsToday < this.config.maxFollowsPerHour) {
                    await this.followUser(tweet.author_id);
                }
            } else if (engagementScore > 0.5) {
                // Medium engagement - like and maybe comment if it's a question
                await this.likeTweet(tweet.id);

                if (this.isQuestion(tweet.text) && this.stats.commentsToday < this.config.maxCommentsPerHour) {
                    await this.generateAndPostComment(tweet);
                }
            } else if (engagementScore > 0.3) {
                // Low engagement - just like
                await this.likeTweet(tweet.id);
            }

        } catch (error) {
            console.error('Error evaluating tweet:', error);
        }
    }

    // Check if tweet is a question (great engagement opportunity)
    isQuestion(text) {
        const questionWords = ['how', 'what', 'why', 'when', 'where', 'which', 'who'];
        const hasQuestionMark = text.includes('?');
        const hasQuestionWord = questionWords.some(word =>
            text.toLowerCase().includes(word + ' ')
        );

        return hasQuestionMark || hasQuestionWord;
    }

    // Evaluate user profile for follow potential
    async evaluateUserProfile(userId, userInfo = null) {
        try {
            let score = 0.5; // Base score

            if (userInfo) {
                // Follower/following ratio analysis
                const followers = userInfo.public_metrics?.followers_count || 0;
                const following = userInfo.public_metrics?.following_count || 0;

                // Skip if outside our target range
                if (followers < this.config.minFollowerCount || followers > this.config.maxFollowerCount) {
                    return 0.2;
                }

                // Calculate follower ratio (good ratio = 0.5 to 2.0)
                const ratio = following > 0 ? followers / following : 0;
                if (ratio >= 0.5 && ratio <= 2.0) {
                    score += 0.2;
                } else if (ratio > 2.0) {
                    score += 0.1; // Might be an influencer
                }

                // Bio analysis for niche relevance
                if (userInfo.description) {
                    const bioScore = this.analyzeBioRelevance(userInfo.description);
                    score += bioScore * 0.3;
                }

                // Account verification (can be positive or negative based on strategy)
                if (userInfo.verified && !this.config.avoidVerifiedAccounts) {
                    score += 0.1;
                }

                // Recent activity analysis (simplified)
                const tweetCount = userInfo.public_metrics?.tweet_count || 0;
                if (tweetCount > 100 && tweetCount < 10000) {
                    score += 0.1; // Active but not spam account
                }
            }

            return Math.min(score, 1.0);
        } catch (error) {
            console.error('Error evaluating user profile:', error);
            return 0.3;
        }
    }

    // Analyze bio for niche relevance
    analyzeBioRelevance(bio) {
        let relevanceScore = 0;
        const bioLower = bio.toLowerCase();

        for (const niche of this.config.targetNiches) {
            if (!niche.keywords) continue;

            const keywords = niche.keywords.split(',').map(k => k.trim().toLowerCase());
            const matches = keywords.filter(keyword => bioLower.includes(keyword)).length;

            if (matches > 0) {
                relevanceScore += (matches / keywords.length) * 0.5;
            }

            // Check niche name in bio
            if (bioLower.includes(niche.name.toLowerCase())) {
                relevanceScore += 0.3;
            }
        }

        return Math.min(relevanceScore, 1.0);
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

    // Generate smart AI comment using niche-specific persona
    async generateSmartComment(tweetText) {
        try {
            // Find the most relevant niche for this tweet
            const relevantNiche = this.findRelevantNiche(tweetText);

            const prompt = `
Generate a helpful, engaging reply to this tweet: "${tweetText}"

Context: You are an expert in ${relevantNiche?.name || 'content creation'}.
${relevantNiche?.persona ? `Persona: ${relevantNiche.persona}` : ''}

Requirements:
- Be genuinely helpful and add value
- Keep it under 280 characters
- Sound natural and conversational
- Don't be promotional or spammy
- Ask a thoughtful question or share a relevant insight
- Use your expertise to provide specific, actionable advice
- Match the tone of the original tweet

Reply:`;

            const response = await geminiService.generateContent({
                name: relevantNiche?.name || 'Smart Comment',
                description: relevantNiche?.description || 'Generate contextual social media comments',
                persona: relevantNiche?.persona || 'Helpful and engaging social media expert',
                keywords: relevantNiche?.keywords || 'engagement, conversation, value'
            }, 'comment');

            // Extract just the comment text
            return response.comment || response.tweet || '';
        } catch (error) {
            console.error('Error generating comment:', error);
            return '';
        }
    }

    // Find the most relevant niche for a tweet
    findRelevantNiche(tweetText) {
        let bestMatch = null;
        let highestScore = 0;

        for (const niche of this.config.targetNiches) {
            if (!niche.keywords) continue;

            const keywords = niche.keywords.split(',').map(k => k.trim().toLowerCase());
            const tweetLower = tweetText.toLowerCase();

            // Count keyword matches
            const matches = keywords.filter(keyword =>
                tweetLower.includes(keyword) ||
                tweetLower.includes(keyword.replace(/\s+/g, ''))
            ).length;

            const score = matches / keywords.length;

            if (score > highestScore) {
                highestScore = score;
                bestMatch = niche;
            }
        }

        return bestMatch;
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
            humanPostsToday: 0,
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

    // Engage with influencers (limited and strategic)
    async engageWithInfluencers() {
        // Placeholder for influencer engagement
        // This would identify and engage with key influencers in the niche
        console.log('🌟 Checking for influencer engagement opportunities...');
    }

    // Clean up old follows that didn't follow back
    async cleanupOldFollows() {
        // Placeholder for follow cleanup
        // This would unfollow users who didn't follow back after a certain period
        console.log('🧹 Cleaning up old follows...');
    }

    // Post human-like content to appear more authentic
    async postHumanLikeContent() {
        if (!this.config.enableHumanPosts) return;
        if (this.stats.humanPostsToday >= this.config.maxHumanPostsPerDay) return;

        try {
            const currentHour = new Date().getHours();

            // Only post during optimal hours
            if (!this.config.humanPostingHours.includes(currentHour)) return;

            // Random chance to post (20% chance when conditions are met)
            if (Math.random() > 0.2) return;

            console.log('🤖 Generating human-like post...');

            // Generate contextual human-like post
            const humanPost = await this.generateHumanLikePost();

            if (humanPost && humanPost.length > 0 && humanPost.length <= 280) {
                await this.twitterClient.v2.tweet(humanPost);
                this.stats.humanPostsToday++;

                console.log(`📝 Posted human-like content: "${humanPost.substring(0, 50)}..."`);

                // Add longer delay after posting original content
                await this.sleep(10000); // 10 second delay
            }
        } catch (error) {
            console.error('Error posting human-like content:', error);
        }
    }

    // Generate human-like posts based on niche expertise
    async generateHumanLikePost() {
        try {
            const postType = this.config.humanPostTypes[Math.floor(Math.random() * this.config.humanPostTypes.length)];
            const relevantNiche = this.getRandomNiche();

            const prompt = this.buildHumanPostPrompt(postType, relevantNiche);

            const response = await geminiService.generateContent({
                name: relevantNiche?.name || 'General',
                description: relevantNiche?.description || 'General content creator',
                persona: relevantNiche?.persona || 'Knowledgeable and helpful content creator',
                keywords: relevantNiche?.keywords || 'content, tips, insights'
            }, 'human_post', prompt);

            // Extract just the tweet text
            return response.tweet || response.post || '';
        } catch (error) {
            console.error('Error generating human-like post:', error);
            return '';
        }
    }

    // Build prompt for human-like posts
    buildHumanPostPrompt(postType, niche) {
        const timeContext = this.getTimeContext();

        const prompts = {
            insight: `Share a valuable insight about ${niche?.name || 'your expertise'}. Make it feel like a genuine realization or lesson learned. Keep it under 280 characters.`,

            question: `Ask an engaging question related to ${niche?.name || 'your field'} that would spark discussion. Make it thoughtful and relevant to current trends. Keep it under 280 characters.`,

            tip: `Share a practical tip about ${niche?.name || 'your expertise'}. Make it actionable and valuable. Write it like you're helping a friend. Keep it under 280 characters.`,

            observation: `Make an interesting observation about trends or changes in ${niche?.name || 'your industry'}. Make it thoughtful and current. Keep it under 280 characters.`,

            motivation: `Share some motivation or encouragement related to ${niche?.name || 'personal growth'}. Make it genuine and uplifting. Keep it under 280 characters.`
        };

        const basePrompt = prompts[postType] || prompts.insight;

        return `
${basePrompt}

Context: It's ${timeContext.day} ${timeContext.time}.
Niche: ${niche?.name || 'General'}
Persona: ${niche?.persona || 'Helpful expert'}

Requirements:
- Sound completely natural and human
- No promotional content or links
- Use conversational tone
- Include 1-2 relevant emojis naturally
- Make it feel spontaneous, not scripted
- Keep under 280 characters
- Don't use hashtags (make it feel organic)

Generate a single, authentic ${postType} post:`;
    }

    // Get random niche from target niches
    getRandomNiche() {
        if (this.config.targetNiches.length === 0) return null;
        return this.config.targetNiches[Math.floor(Math.random() * this.config.targetNiches.length)];
    }

    // Get current time context
    getTimeContext() {
        const now = new Date();
        const hour = now.getHours();

        let timeOfDay = 'morning';
        if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
        else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
        else if (hour >= 21 || hour < 6) timeOfDay = 'night';

        return {
            day: now.toLocaleDateString('en-US', { weekday: 'long' }),
            time: timeOfDay,
            hour: hour
        };
    }

    // Utility function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new GrowthBotService();
