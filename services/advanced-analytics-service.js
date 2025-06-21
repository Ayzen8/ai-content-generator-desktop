const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AdvancedAnalyticsService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initializeAnalyticsTables();
    }

    // Initialize analytics tables
    initializeAnalyticsTables() {
        const createAnalyticsTables = `
            CREATE TABLE IF NOT EXISTS content_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0,
                reach INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                click_through_rate REAL DEFAULT 0,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (content_id) REFERENCES content (id)
            );

            CREATE TABLE IF NOT EXISTS growth_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                platform TEXT NOT NULL,
                followers_count INTEGER DEFAULT 0,
                following_count INTEGER DEFAULT 0,
                posts_count INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0,
                reach INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                profile_visits INTEGER DEFAULT 0,
                website_clicks INTEGER DEFAULT 0,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS content_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER NOT NULL,
                niche_id INTEGER NOT NULL,
                style TEXT NOT NULL,
                emotion TEXT NOT NULL,
                performance_score REAL DEFAULT 0,
                optimal_posting_time TIME,
                hashtag_performance TEXT, -- JSON string
                audience_demographics TEXT, -- JSON string
                engagement_breakdown TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (content_id) REFERENCES content (id),
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS growth_bot_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                actions_performed INTEGER DEFAULT 0,
                likes_given INTEGER DEFAULT 0,
                comments_posted INTEGER DEFAULT 0,
                follows_made INTEGER DEFAULT 0,
                followers_gained INTEGER DEFAULT 0,
                engagement_received INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0,
                target_niches TEXT, -- JSON string
                performance_metrics TEXT, -- JSON string
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS optimal_posting_times (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                niche_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                day_of_week INTEGER NOT NULL, -- 0-6 (Sunday-Saturday)
                hour INTEGER NOT NULL, -- 0-23
                engagement_score REAL DEFAULT 0,
                sample_size INTEGER DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );
        `;

        this.db.exec(createAnalyticsTables, (err) => {
            if (err) {
                console.error('Error creating analytics tables:', err);
            } else {
                console.log('✅ Analytics tables initialized');
            }
        });
    }

    // Record content performance
    async recordContentPerformance(contentId, platform, metrics) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO content_performance 
                (content_id, platform, views, likes, shares, comments, engagement_rate, reach, impressions, click_through_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                contentId,
                platform,
                metrics.views || 0,
                metrics.likes || 0,
                metrics.shares || 0,
                metrics.comments || 0,
                metrics.engagement_rate || 0,
                metrics.reach || 0,
                metrics.impressions || 0,
                metrics.click_through_rate || 0
            ], function(err) {
                if (err) {
                    console.error('Error recording content performance:', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Record growth metrics
    async recordGrowthMetrics(platform, metrics) {
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            
            const query = `
                INSERT OR REPLACE INTO growth_metrics 
                (date, platform, followers_count, following_count, posts_count, engagement_rate, reach, impressions, profile_visits, website_clicks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                today,
                platform,
                metrics.followers_count || 0,
                metrics.following_count || 0,
                metrics.posts_count || 0,
                metrics.engagement_rate || 0,
                metrics.reach || 0,
                metrics.impressions || 0,
                metrics.profile_visits || 0,
                metrics.website_clicks || 0
            ], function(err) {
                if (err) {
                    console.error('Error recording growth metrics:', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Record Growth Bot analytics
    async recordGrowthBotAnalytics(metrics) {
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            
            const query = `
                INSERT OR REPLACE INTO growth_bot_analytics 
                (date, actions_performed, likes_given, comments_posted, follows_made, followers_gained, engagement_received, success_rate, target_niches, performance_metrics)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                today,
                metrics.actions_performed || 0,
                metrics.likes_given || 0,
                metrics.comments_posted || 0,
                metrics.follows_made || 0,
                metrics.followers_gained || 0,
                metrics.engagement_received || 0,
                metrics.success_rate || 0,
                JSON.stringify(metrics.target_niches || []),
                JSON.stringify(metrics.performance_metrics || {})
            ], function(err) {
                if (err) {
                    console.error('Error recording growth bot analytics:', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get comprehensive analytics dashboard data
    async getDashboardAnalytics(timeframe = '30d') {
        try {
            const [
                contentPerformance,
                growthMetrics,
                topPerformingContent,
                nichePerformance,
                growthBotMetrics,
                optimalTimes
            ] = await Promise.all([
                this.getContentPerformanceAnalytics(timeframe),
                this.getGrowthMetrics(timeframe),
                this.getTopPerformingContent(timeframe),
                this.getNichePerformanceAnalytics(timeframe),
                this.getGrowthBotMetrics(timeframe),
                this.getOptimalPostingTimes()
            ]);

            return {
                timeframe,
                contentPerformance,
                growthMetrics,
                topPerformingContent,
                nichePerformance,
                growthBotMetrics,
                optimalTimes,
                insights: this.generateInsights({
                    contentPerformance,
                    growthMetrics,
                    topPerformingContent,
                    nichePerformance
                })
            };
        } catch (error) {
            console.error('Error getting dashboard analytics:', error);
            throw error;
        }
    }

    // Get content performance analytics
    async getContentPerformanceAnalytics(timeframe) {
        return new Promise((resolve, reject) => {
            const daysBack = this.parseTimeframe(timeframe);
            
            const query = `
                SELECT 
                    cp.platform,
                    COUNT(*) as total_posts,
                    AVG(cp.engagement_rate) as avg_engagement_rate,
                    SUM(cp.likes) as total_likes,
                    SUM(cp.shares) as total_shares,
                    SUM(cp.comments) as total_comments,
                    SUM(cp.views) as total_views,
                    AVG(cp.reach) as avg_reach
                FROM content_performance cp
                WHERE cp.recorded_at >= datetime('now', '-${daysBack} days')
                GROUP BY cp.platform
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

    // Get growth metrics
    async getGrowthMetrics(timeframe) {
        return new Promise((resolve, reject) => {
            const daysBack = this.parseTimeframe(timeframe);
            
            const query = `
                SELECT 
                    date,
                    platform,
                    followers_count,
                    following_count,
                    engagement_rate,
                    reach,
                    impressions
                FROM growth_metrics
                WHERE date >= date('now', '-${daysBack} days')
                ORDER BY date DESC, platform
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

    // Get top performing content
    async getTopPerformingContent(timeframe, limit = 10) {
        return new Promise((resolve, reject) => {
            const daysBack = this.parseTimeframe(timeframe);
            
            const query = `
                SELECT 
                    c.id,
                    c.title,
                    c.content,
                    c.type,
                    n.name as niche_name,
                    cp.platform,
                    cp.engagement_rate,
                    cp.likes,
                    cp.shares,
                    cp.comments,
                    cp.views,
                    cp.recorded_at
                FROM content c
                JOIN content_performance cp ON c.id = cp.content_id
                JOIN niches n ON c.niche_id = n.id
                WHERE cp.recorded_at >= datetime('now', '-${daysBack} days')
                ORDER BY cp.engagement_rate DESC, cp.likes DESC
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

    // Parse timeframe string to days
    parseTimeframe(timeframe) {
        const timeframeMap = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        };
        return timeframeMap[timeframe] || 30;
    }

    // Get niche performance analytics
    async getNichePerformanceAnalytics(timeframe) {
        return new Promise((resolve, reject) => {
            const daysBack = this.parseTimeframe(timeframe);

            const query = `
                SELECT
                    n.name as niche_name,
                    n.id as niche_id,
                    COUNT(c.id) as total_content,
                    AVG(cp.engagement_rate) as avg_engagement_rate,
                    SUM(cp.likes) as total_likes,
                    SUM(cp.views) as total_views,
                    MAX(cp.engagement_rate) as best_engagement_rate
                FROM niches n
                LEFT JOIN content c ON n.id = c.niche_id
                LEFT JOIN content_performance cp ON c.id = cp.content_id
                WHERE cp.recorded_at >= datetime('now', '-${daysBack} days') OR cp.recorded_at IS NULL
                GROUP BY n.id, n.name
                ORDER BY avg_engagement_rate DESC
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

    // Get Growth Bot metrics
    async getGrowthBotMetrics(timeframe) {
        return new Promise((resolve, reject) => {
            const daysBack = this.parseTimeframe(timeframe);

            const query = `
                SELECT
                    date,
                    actions_performed,
                    likes_given,
                    comments_posted,
                    follows_made,
                    followers_gained,
                    engagement_received,
                    success_rate
                FROM growth_bot_analytics
                WHERE date >= date('now', '-${daysBack} days')
                ORDER BY date DESC
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

    // Get optimal posting times
    async getOptimalPostingTimes() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    n.name as niche_name,
                    opt.platform,
                    opt.day_of_week,
                    opt.hour,
                    opt.engagement_score,
                    opt.sample_size
                FROM optimal_posting_times opt
                JOIN niches n ON opt.niche_id = n.id
                WHERE opt.sample_size >= 5
                ORDER BY opt.engagement_score DESC
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

    // Update optimal posting times based on performance data
    async updateOptimalPostingTimes(nicheId, platform, dayOfWeek, hour, engagementScore) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO optimal_posting_times
                (niche_id, platform, day_of_week, hour, engagement_score, sample_size, last_updated)
                VALUES (?, ?, ?, ?, ?,
                    COALESCE((SELECT sample_size + 1 FROM optimal_posting_times
                             WHERE niche_id = ? AND platform = ? AND day_of_week = ? AND hour = ?), 1),
                    CURRENT_TIMESTAMP)
            `;

            this.db.run(query, [
                nicheId, platform, dayOfWeek, hour, engagementScore,
                nicheId, platform, dayOfWeek, hour
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Generate AI-powered insights
    generateInsights(data) {
        const insights = [];

        // Content performance insights
        if (data.contentPerformance && data.contentPerformance.length > 0) {
            const bestPlatform = data.contentPerformance.reduce((best, current) =>
                current.avg_engagement_rate > best.avg_engagement_rate ? current : best
            );

            insights.push({
                type: 'performance',
                title: 'Best Performing Platform',
                message: `${bestPlatform.platform} has the highest engagement rate at ${(bestPlatform.avg_engagement_rate * 100).toFixed(1)}%`,
                actionable: `Focus more content creation efforts on ${bestPlatform.platform}`,
                priority: 'high'
            });
        }

        // Growth insights
        if (data.growthMetrics && data.growthMetrics.length > 1) {
            const recent = data.growthMetrics[0];
            const previous = data.growthMetrics[1];

            if (recent && previous) {
                const growthRate = ((recent.followers_count - previous.followers_count) / previous.followers_count) * 100;

                insights.push({
                    type: 'growth',
                    title: 'Follower Growth Trend',
                    message: `${growthRate > 0 ? 'Growing' : 'Declining'} at ${Math.abs(growthRate).toFixed(1)}% rate`,
                    actionable: growthRate < 0 ? 'Consider adjusting content strategy and posting frequency' : 'Maintain current strategy',
                    priority: growthRate < -5 ? 'high' : 'medium'
                });
            }
        }

        // Niche performance insights
        if (data.nichePerformance && data.nichePerformance.length > 0) {
            const topNiche = data.nichePerformance[0];
            if (topNiche.avg_engagement_rate > 0) {
                insights.push({
                    type: 'niche',
                    title: 'Top Performing Niche',
                    message: `${topNiche.niche_name} generates the highest engagement`,
                    actionable: `Create more content in the ${topNiche.niche_name} niche`,
                    priority: 'medium'
                });
            }
        }

        // Content volume insights
        if (data.topPerformingContent && data.topPerformingContent.length > 0) {
            const avgEngagement = data.topPerformingContent.reduce((sum, content) =>
                sum + content.engagement_rate, 0) / data.topPerformingContent.length;

            insights.push({
                type: 'content',
                title: 'Content Quality',
                message: `Average engagement rate is ${(avgEngagement * 100).toFixed(1)}%`,
                actionable: avgEngagement < 0.03 ? 'Focus on improving content quality and relevance' : 'Maintain current content quality standards',
                priority: avgEngagement < 0.02 ? 'high' : 'low'
            });
        }

        return insights;
    }

    // Get predictive analytics
    async getPredictiveAnalytics() {
        try {
            const [growthTrend, contentTrend, engagementTrend] = await Promise.all([
                this.predictGrowthTrend(),
                this.predictContentPerformance(),
                this.predictEngagementTrend()
            ]);

            return {
                growthTrend,
                contentTrend,
                engagementTrend,
                recommendations: this.generateRecommendations({
                    growthTrend,
                    contentTrend,
                    engagementTrend
                })
            };
        } catch (error) {
            console.error('Error getting predictive analytics:', error);
            throw error;
        }
    }

    // Predict growth trend (simplified linear regression)
    async predictGrowthTrend() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    date,
                    SUM(followers_count) as total_followers
                FROM growth_metrics
                WHERE date >= date('now', '-30 days')
                GROUP BY date
                ORDER BY date
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if (rows.length < 2) {
                        resolve({ trend: 'insufficient_data', prediction: 0 });
                        return;
                    }

                    // Simple linear trend calculation
                    const firstWeek = rows.slice(0, 7).reduce((sum, row) => sum + row.total_followers, 0) / 7;
                    const lastWeek = rows.slice(-7).reduce((sum, row) => sum + row.total_followers, 0) / 7;

                    const weeklyGrowth = lastWeek - firstWeek;
                    const growthRate = firstWeek > 0 ? (weeklyGrowth / firstWeek) * 100 : 0;

                    resolve({
                        trend: weeklyGrowth > 0 ? 'growing' : 'declining',
                        weeklyGrowth: Math.round(weeklyGrowth),
                        growthRate: growthRate.toFixed(2),
                        prediction: Math.round(lastWeek + (weeklyGrowth * 4)) // 4 weeks ahead
                    });
                }
            });
        });
    }

    // Predict content performance
    async predictContentPerformance() {
        // Simplified prediction based on historical data
        return {
            expectedEngagementRate: 0.035, // 3.5% based on industry averages
            recommendedPostingFrequency: '2-3 posts per day',
            bestPerformingContentTypes: ['educational', 'entertaining', 'inspirational']
        };
    }

    // Predict engagement trend
    async predictEngagementTrend() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    AVG(engagement_rate) as avg_engagement
                FROM content_performance
                WHERE recorded_at >= datetime('now', '-7 days')
            `;

            this.db.get(query, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    const currentEngagement = row?.avg_engagement || 0;
                    resolve({
                        current: currentEngagement,
                        predicted: currentEngagement * 1.1, // 10% improvement prediction
                        confidence: currentEngagement > 0 ? 'medium' : 'low'
                    });
                }
            });
        });
    }

    // Generate recommendations based on analytics
    generateRecommendations(data) {
        const recommendations = [];

        if (data.growthTrend.trend === 'declining') {
            recommendations.push({
                type: 'growth',
                priority: 'high',
                title: 'Boost Growth Strategy',
                description: 'Your follower growth is declining. Consider increasing posting frequency and engagement.',
                actions: [
                    'Increase posting frequency to 2-3 times per day',
                    'Engage more actively with your audience',
                    'Use trending hashtags in your niche',
                    'Collaborate with other creators'
                ]
            });
        }

        if (data.engagementTrend.current < 0.02) {
            recommendations.push({
                type: 'engagement',
                priority: 'high',
                title: 'Improve Content Quality',
                description: 'Your engagement rate is below average. Focus on creating more valuable content.',
                actions: [
                    'Ask questions to encourage comments',
                    'Share personal stories and experiences',
                    'Create educational content with actionable tips',
                    'Use eye-catching visuals and graphics'
                ]
            });
        }

        return recommendations;
    }
}

module.exports = new AdvancedAnalyticsService();
