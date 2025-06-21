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

            CREATE TABLE IF NOT EXISTS predictive_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_type TEXT NOT NULL, -- 'engagement', 'reach', 'viral_potential'
                niche_id INTEGER,
                platform TEXT NOT NULL,
                predicted_value REAL NOT NULL,
                confidence_score REAL NOT NULL, -- 0 to 1
                factors TEXT, -- JSON string with contributing factors
                actual_value REAL,
                accuracy_score REAL,
                prediction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                validation_date DATETIME,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS content_trends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trend_type TEXT NOT NULL, -- 'hashtag', 'topic', 'format', 'timing'
                trend_value TEXT NOT NULL,
                niche_id INTEGER,
                platform TEXT NOT NULL,
                popularity_score REAL NOT NULL, -- 0 to 100
                growth_rate REAL NOT NULL, -- percentage
                peak_time TEXT,
                duration_days INTEGER,
                engagement_multiplier REAL DEFAULT 1.0,
                first_detected DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active', -- 'active', 'declining', 'expired'
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS content_optimization_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER,
                suggestion_type TEXT NOT NULL, -- 'hashtag', 'timing', 'format', 'length', 'tone'
                current_value TEXT,
                suggested_value TEXT,
                expected_improvement REAL, -- percentage
                confidence_score REAL, -- 0 to 1
                reasoning TEXT,
                priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
                status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'dismissed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                applied_at DATETIME,
                FOREIGN KEY (content_id) REFERENCES content (id)
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

    // Generate predictive analytics
    async generatePredictiveAnalytics(nicheId, platform) {
        try {
            // Get historical performance data
            const historicalData = await this.getHistoricalPerformanceData(nicheId, platform);

            if (historicalData.length < 5) {
                return { error: 'Insufficient data for predictions' };
            }

            // Calculate engagement prediction
            const engagementPrediction = this.calculateEngagementPrediction(historicalData);

            // Calculate reach prediction
            const reachPrediction = this.calculateReachPrediction(historicalData);

            // Calculate viral potential
            const viralPotential = this.calculateViralPotential(historicalData);

            // Save predictions
            await this.savePrediction('engagement', nicheId, platform, engagementPrediction);
            await this.savePrediction('reach', nicheId, platform, reachPrediction);
            await this.savePrediction('viral_potential', nicheId, platform, viralPotential);

            return {
                engagement: engagementPrediction,
                reach: reachPrediction,
                viral_potential: viralPotential
            };
        } catch (error) {
            console.error('Error generating predictive analytics:', error);
            throw error;
        }
    }

    // Get historical performance data
    async getHistoricalPerformanceData(nicheId, platform) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT cp.*, c.niche_id
                FROM content_performance cp
                JOIN content c ON cp.content_id = c.id
                WHERE c.niche_id = ? AND cp.platform = ?
                ORDER BY cp.recorded_at DESC
                LIMIT 50
            `;

            this.db.all(query, [nicheId, platform], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Calculate engagement prediction using moving average and trend analysis
    calculateEngagementPrediction(historicalData) {
        const engagementRates = historicalData.map(d => d.engagement_rate).filter(r => r > 0);

        if (engagementRates.length === 0) {
            return { predicted_value: 0, confidence_score: 0 };
        }

        // Simple moving average
        const recentRates = engagementRates.slice(0, 10);
        const average = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;

        // Calculate trend
        const trend = this.calculateTrend(recentRates);

        // Adjust prediction based on trend
        const predicted_value = Math.max(0, average + (trend * 0.1));

        // Confidence based on data consistency
        const variance = this.calculateVariance(recentRates);
        const confidence_score = Math.max(0.1, 1 - (variance / average));

        return {
            predicted_value: Math.round(predicted_value * 10000) / 10000,
            confidence_score: Math.round(confidence_score * 100) / 100,
            factors: {
                historical_average: Math.round(average * 10000) / 10000,
                trend: Math.round(trend * 10000) / 10000,
                data_points: recentRates.length
            }
        };
    }

    // Calculate reach prediction
    calculateReachPrediction(historicalData) {
        const reachData = historicalData.map(d => d.reach).filter(r => r > 0);

        if (reachData.length === 0) {
            return { predicted_value: 0, confidence_score: 0 };
        }

        const recentReach = reachData.slice(0, 10);
        const average = recentReach.reduce((sum, reach) => sum + reach, 0) / recentReach.length;
        const trend = this.calculateTrend(recentReach);

        const predicted_value = Math.max(0, average + (trend * 0.15));
        const variance = this.calculateVariance(recentReach);
        const confidence_score = Math.max(0.1, 1 - (variance / average));

        return {
            predicted_value: Math.round(predicted_value),
            confidence_score: Math.round(confidence_score * 100) / 100,
            factors: {
                historical_average: Math.round(average),
                trend: Math.round(trend),
                data_points: recentReach.length
            }
        };
    }

    // Calculate viral potential
    calculateViralPotential(historicalData) {
        const viralScores = historicalData.map(d => {
            // Calculate viral score based on shares, comments, and engagement rate
            const shareRate = d.shares / Math.max(d.views, 1);
            const commentRate = d.comments / Math.max(d.views, 1);
            return (shareRate * 0.6) + (commentRate * 0.4) + (d.engagement_rate * 0.2);
        }).filter(s => s > 0);

        if (viralScores.length === 0) {
            return { predicted_value: 0, confidence_score: 0 };
        }

        const average = viralScores.reduce((sum, score) => sum + score, 0) / viralScores.length;
        const maxViral = Math.max(...viralScores);

        // Viral potential is based on historical max and recent performance
        const predicted_value = Math.min(1, (average + maxViral) / 2);
        const confidence_score = viralScores.length >= 10 ? 0.8 : 0.5;

        return {
            predicted_value: Math.round(predicted_value * 100) / 100,
            confidence_score: confidence_score,
            factors: {
                historical_average: Math.round(average * 100) / 100,
                historical_max: Math.round(maxViral * 100) / 100,
                data_points: viralScores.length
            }
        };
    }

    // Calculate trend (simple linear regression slope)
    calculateTrend(data) {
        if (data.length < 2) return 0;

        const n = data.length;
        const sumX = (n * (n - 1)) / 2; // Sum of indices
        const sumY = data.reduce((sum, val) => sum + val, 0);
        const sumXY = data.reduce((sum, val, index) => sum + (index * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope || 0;
    }

    // Calculate variance
    calculateVariance(data) {
        if (data.length === 0) return 0;

        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        return variance;
    }

    // Save prediction to database
    async savePrediction(type, nicheId, platform, prediction) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO predictive_analytics
                (prediction_type, niche_id, platform, predicted_value, confidence_score, factors)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                type,
                nicheId,
                platform,
                prediction.predicted_value,
                prediction.confidence_score,
                JSON.stringify(prediction.factors)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Analyze content trends
    async analyzeContentTrends(platform = null, nicheId = null) {
        try {
            // Analyze hashtag trends
            const hashtagTrends = await this.analyzeHashtagTrends(platform, nicheId);

            // Analyze posting time trends
            const timingTrends = await this.analyzeTimingTrends(platform, nicheId);

            // Analyze content format trends
            const formatTrends = await this.analyzeFormatTrends(platform, nicheId);

            return {
                hashtag_trends: hashtagTrends,
                timing_trends: timingTrends,
                format_trends: formatTrends
            };
        } catch (error) {
            console.error('Error analyzing content trends:', error);
            throw error;
        }
    }

    // Analyze hashtag trends
    async analyzeHashtagTrends(platform, nicheId) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT ci.hashtag_performance, cp.engagement_rate, cp.recorded_at
                FROM content_insights ci
                JOIN content_performance cp ON ci.content_id = cp.content_id
                WHERE ci.hashtag_performance IS NOT NULL
            `;
            const params = [];

            if (platform) {
                query += ' AND cp.platform = ?';
                params.push(platform);
            }

            if (nicheId) {
                query += ' AND ci.niche_id = ?';
                params.push(nicheId);
            }

            query += ' ORDER BY cp.recorded_at DESC LIMIT 100';

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const hashtagAnalysis = this.processHashtagData(rows);
                    resolve(hashtagAnalysis);
                }
            });
        });
    }

    // Process hashtag data to find trends
    processHashtagData(rows) {
        const hashtagPerformance = {};

        rows.forEach(row => {
            try {
                const hashtags = JSON.parse(row.hashtag_performance);
                Object.entries(hashtags).forEach(([hashtag, performance]) => {
                    if (!hashtagPerformance[hashtag]) {
                        hashtagPerformance[hashtag] = [];
                    }
                    hashtagPerformance[hashtag].push({
                        performance: performance,
                        engagement: row.engagement_rate,
                        date: row.recorded_at
                    });
                });
            } catch (error) {
                // Skip invalid JSON
            }
        });

        // Calculate trending hashtags
        const trends = Object.entries(hashtagPerformance)
            .map(([hashtag, data]) => {
                const avgPerformance = data.reduce((sum, d) => sum + d.performance, 0) / data.length;
                const recentPerformance = data.slice(0, 5).reduce((sum, d) => sum + d.performance, 0) / Math.min(5, data.length);
                const growthRate = data.length >= 5 ? ((recentPerformance - avgPerformance) / avgPerformance) * 100 : 0;

                return {
                    hashtag,
                    popularity_score: Math.round(avgPerformance * 100) / 100,
                    growth_rate: Math.round(growthRate * 100) / 100,
                    usage_count: data.length
                };
            })
            .filter(trend => trend.usage_count >= 3)
            .sort((a, b) => b.growth_rate - a.growth_rate)
            .slice(0, 10);

        return trends;
    }

    // Generate optimization recommendations
    async generateOptimizationRecommendations() {
        try {
            const recommendations = [];

            // Get recent content performance
            const recentContent = await this.getRecentContentForOptimization();

            for (const content of recentContent) {
                const suggestions = await this.generateContentOptimizationSuggestions(content);
                recommendations.push(...suggestions);
            }

            return recommendations.slice(0, 10); // Return top 10 recommendations
        } catch (error) {
            console.error('Error generating optimization recommendations:', error);
            throw error;
        }
    }

    // Get recent content for optimization
    async getRecentContentForOptimization() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT c.*, cp.engagement_rate, cp.likes, cp.shares, cp.comments
                FROM content c
                JOIN content_performance cp ON c.id = cp.content_id
                WHERE cp.recorded_at >= datetime('now', '-30 days')
                ORDER BY cp.recorded_at DESC
                LIMIT 20
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

    // Generate content optimization suggestions
    async generateContentOptimizationSuggestions(content) {
        const suggestions = [];

        // Analyze engagement rate
        if (content.engagement_rate < 0.02) {
            suggestions.push({
                content_id: content.id,
                suggestion_type: 'engagement',
                current_value: `${(content.engagement_rate * 100).toFixed(2)}%`,
                suggested_value: 'Add more engaging hooks and call-to-actions',
                expected_improvement: 25,
                confidence_score: 0.7,
                reasoning: 'Low engagement rate suggests content needs more compelling hooks',
                priority: 'high'
            });
        }

        // Analyze content length
        const contentLength = content.content?.length || 0;
        if (contentLength > 280 && content.type === 'twitter') {
            suggestions.push({
                content_id: content.id,
                suggestion_type: 'length',
                current_value: `${contentLength} characters`,
                suggested_value: 'Reduce to under 280 characters',
                expected_improvement: 15,
                confidence_score: 0.8,
                reasoning: 'Shorter tweets typically perform better',
                priority: 'medium'
            });
        }

        return suggestions;
    }
}

module.exports = new AdvancedAnalyticsService();
