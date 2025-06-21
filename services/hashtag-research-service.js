const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class HashtagResearchService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initializeHashtagTables();
    }

    // Initialize hashtag research tables
    initializeHashtagTables() {
        const createHashtagTables = `
            CREATE TABLE IF NOT EXISTS hashtag_research (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hashtag TEXT NOT NULL UNIQUE,
                niche_id INTEGER,
                category TEXT NOT NULL, -- 'trending', 'niche', 'broad', 'micro'
                popularity_score REAL DEFAULT 0,
                competition_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
                engagement_potential REAL DEFAULT 0,
                usage_count INTEGER DEFAULT 0,
                last_trending_date DATE,
                is_banned BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS hashtag_combinations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                niche_id INTEGER,
                hashtags TEXT NOT NULL, -- JSON array of hashtags
                performance_score REAL DEFAULT 0,
                usage_count INTEGER DEFAULT 0,
                is_favorite BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS hashtag_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hashtag TEXT NOT NULL,
                date DATE NOT NULL,
                reach INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0,
                posts_count INTEGER DEFAULT 0,
                platform TEXT NOT NULL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS trending_hashtags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hashtag TEXT NOT NULL,
                platform TEXT NOT NULL,
                trend_score REAL DEFAULT 0,
                category TEXT,
                region TEXT DEFAULT 'global',
                trending_since DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            );
        `;

        this.db.exec(createHashtagTables, (err) => {
            if (err) {
                console.error('Error creating hashtag tables:', err);
            } else {
                console.log('✅ Hashtag research tables initialized');
                this.seedDefaultHashtags();
            }
        });
    }

    // Seed default hashtags for each niche
    async seedDefaultHashtags() {
        try {
            const existingHashtags = await this.getHashtagsByCategory('niche');
            if (existingHashtags.length === 0) {
                await this.createDefaultHashtags();
                console.log('✅ Default hashtags seeded');
            }
        } catch (error) {
            console.error('Error seeding default hashtags:', error);
        }
    }

    // Create default hashtags for popular niches
    async createDefaultHashtags() {
        const defaultHashtags = [
            // Finance & Business
            { hashtag: '#investing', category: 'niche', popularity_score: 0.85, competition_level: 'high' },
            { hashtag: '#stockmarket', category: 'niche', popularity_score: 0.80, competition_level: 'high' },
            { hashtag: '#cryptocurrency', category: 'niche', popularity_score: 0.90, competition_level: 'high' },
            { hashtag: '#financialfreedom', category: 'niche', popularity_score: 0.75, competition_level: 'medium' },
            { hashtag: '#wealthbuilding', category: 'niche', popularity_score: 0.70, competition_level: 'medium' },
            { hashtag: '#personalfinance', category: 'niche', popularity_score: 0.85, competition_level: 'high' },
            
            // Health & Wellness
            { hashtag: '#fitness', category: 'broad', popularity_score: 0.95, competition_level: 'high' },
            { hashtag: '#wellness', category: 'niche', popularity_score: 0.80, competition_level: 'medium' },
            { hashtag: '#mentalhealth', category: 'niche', popularity_score: 0.85, competition_level: 'medium' },
            { hashtag: '#nutrition', category: 'niche', popularity_score: 0.75, competition_level: 'medium' },
            { hashtag: '#mindfulness', category: 'niche', popularity_score: 0.70, competition_level: 'medium' },
            { hashtag: '#selfcare', category: 'niche', popularity_score: 0.80, competition_level: 'medium' },
            
            // Technology & Gaming
            { hashtag: '#technology', category: 'broad', popularity_score: 0.90, competition_level: 'high' },
            { hashtag: '#gaming', category: 'broad', popularity_score: 0.95, competition_level: 'high' },
            { hashtag: '#ai', category: 'trending', popularity_score: 0.95, competition_level: 'high' },
            { hashtag: '#machinelearning', category: 'niche', popularity_score: 0.75, competition_level: 'medium' },
            { hashtag: '#coding', category: 'niche', popularity_score: 0.80, competition_level: 'medium' },
            { hashtag: '#programming', category: 'niche', popularity_score: 0.85, competition_level: 'high' },
            
            // Anime & Manga
            { hashtag: '#anime', category: 'broad', popularity_score: 0.90, competition_level: 'high' },
            { hashtag: '#manga', category: 'niche', popularity_score: 0.80, competition_level: 'medium' },
            { hashtag: '#otaku', category: 'niche', popularity_score: 0.70, competition_level: 'medium' },
            { hashtag: '#animeart', category: 'niche', popularity_score: 0.75, competition_level: 'medium' },
            { hashtag: '#cosplay', category: 'niche', popularity_score: 0.85, competition_level: 'high' },
            { hashtag: '#animereview', category: 'micro', popularity_score: 0.60, competition_level: 'low' },
            
            // General/Broad hashtags
            { hashtag: '#motivation', category: 'broad', popularity_score: 0.90, competition_level: 'high' },
            { hashtag: '#inspiration', category: 'broad', popularity_score: 0.85, competition_level: 'high' },
            { hashtag: '#success', category: 'broad', popularity_score: 0.80, competition_level: 'high' },
            { hashtag: '#lifestyle', category: 'broad', popularity_score: 0.85, competition_level: 'high' },
            { hashtag: '#entrepreneur', category: 'niche', popularity_score: 0.80, competition_level: 'high' },
            { hashtag: '#mindset', category: 'niche', popularity_score: 0.75, competition_level: 'medium' },
            
            // Micro hashtags (lower competition)
            { hashtag: '#contentcreator', category: 'micro', popularity_score: 0.65, competition_level: 'low' },
            { hashtag: '#digitalmarketing', category: 'micro', popularity_score: 0.70, competition_level: 'low' },
            { hashtag: '#socialmedia', category: 'micro', popularity_score: 0.75, competition_level: 'medium' },
            { hashtag: '#onlinebusiness', category: 'micro', popularity_score: 0.65, competition_level: 'low' }
        ];

        for (const hashtag of defaultHashtags) {
            await this.addHashtag(hashtag);
        }
    }

    // Add a new hashtag to research database
    async addHashtag(hashtagData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO hashtag_research 
                (hashtag, niche_id, category, popularity_score, competition_level, engagement_potential)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                hashtagData.hashtag,
                hashtagData.niche_id || null,
                hashtagData.category,
                hashtagData.popularity_score || 0,
                hashtagData.competition_level || 'medium',
                hashtagData.engagement_potential || hashtagData.popularity_score || 0
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get hashtags by category
    async getHashtagsByCategory(category = null, limit = 50) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT hr.*, n.name as niche_name
                FROM hashtag_research hr
                LEFT JOIN niches n ON hr.niche_id = n.id
                WHERE hr.is_banned = 0
            `;
            
            const params = [];
            
            if (category) {
                query += ` AND hr.category = ?`;
                params.push(category);
            }
            
            query += ` ORDER BY hr.popularity_score DESC, hr.usage_count DESC LIMIT ?`;
            params.push(limit);

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get optimized hashtag mix for content
    async getOptimizedHashtagMix(nicheId = null, contentType = 'general', targetCount = 15) {
        try {
            const [broadHashtags, nicheHashtags, microHashtags, trendingHashtags] = await Promise.all([
                this.getHashtagsByCategory('broad', 5),
                this.getHashtagsByCategory('niche', 8),
                this.getHashtagsByCategory('micro', 5),
                this.getHashtagsByCategory('trending', 3)
            ]);

            // Create optimized mix: 2-3 broad, 6-8 niche, 3-4 micro, 1-2 trending
            const optimizedMix = [
                ...this.selectRandomHashtags(broadHashtags, 3),
                ...this.selectRandomHashtags(nicheHashtags, 7),
                ...this.selectRandomHashtags(microHashtags, 3),
                ...this.selectRandomHashtags(trendingHashtags, 2)
            ];

            // Remove duplicates and limit to target count
            const uniqueHashtags = [...new Set(optimizedMix.map(h => h.hashtag))]
                .slice(0, targetCount)
                .map(hashtag => optimizedMix.find(h => h.hashtag === hashtag));

            return {
                hashtags: uniqueHashtags,
                mix_strategy: {
                    broad: uniqueHashtags.filter(h => h.category === 'broad').length,
                    niche: uniqueHashtags.filter(h => h.category === 'niche').length,
                    micro: uniqueHashtags.filter(h => h.category === 'micro').length,
                    trending: uniqueHashtags.filter(h => h.category === 'trending').length
                },
                total_count: uniqueHashtags.length,
                estimated_reach: this.calculateEstimatedReach(uniqueHashtags)
            };
        } catch (error) {
            console.error('Error getting optimized hashtag mix:', error);
            throw error;
        }
    }

    // Select random hashtags from array
    selectRandomHashtags(hashtags, count) {
        const shuffled = [...hashtags].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, hashtags.length));
    }

    // Calculate estimated reach based on hashtag popularity
    calculateEstimatedReach(hashtags) {
        const totalPopularity = hashtags.reduce((sum, h) => sum + h.popularity_score, 0);
        const avgPopularity = totalPopularity / hashtags.length;
        
        // Estimate reach based on popularity (simplified calculation)
        const baseReach = 1000; // Base reach per hashtag
        const popularityMultiplier = avgPopularity * 10;
        
        return Math.round(baseReach * popularityMultiplier * hashtags.length);
    }

    // Research hashtags for specific niche
    async researchNicheHashtags(nicheId, keywords = []) {
        try {
            // Get existing hashtags for the niche
            const existingHashtags = await this.getHashtagsByNiche(nicheId);
            
            // Generate suggested hashtags based on keywords
            const suggestedHashtags = this.generateHashtagSuggestions(keywords);
            
            // Analyze hashtag performance potential
            const analysis = await this.analyzeHashtagPotential(suggestedHashtags);
            
            return {
                existing_hashtags: existingHashtags,
                suggested_hashtags: analysis,
                recommendations: this.generateHashtagRecommendations(existingHashtags, analysis)
            };
        } catch (error) {
            console.error('Error researching niche hashtags:', error);
            throw error;
        }
    }

    // Get hashtags by niche
    async getHashtagsByNiche(nicheId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM hashtag_research 
                WHERE niche_id = ? AND is_banned = 0
                ORDER BY popularity_score DESC
            `;

            this.db.all(query, [nicheId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Generate hashtag suggestions based on keywords
    generateHashtagSuggestions(keywords) {
        const suggestions = [];
        
        keywords.forEach(keyword => {
            // Clean and format keyword
            const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Generate variations
            suggestions.push(`#${cleanKeyword}`);
            suggestions.push(`#${cleanKeyword}tips`);
            suggestions.push(`#${cleanKeyword}life`);
            suggestions.push(`#${cleanKeyword}community`);
            suggestions.push(`#${cleanKeyword}daily`);
            suggestions.push(`#${cleanKeyword}motivation`);
        });
        
        return [...new Set(suggestions)]; // Remove duplicates
    }

    // Analyze hashtag potential (simplified analysis)
    async analyzeHashtagPotential(hashtags) {
        return hashtags.map(hashtag => {
            // Simplified scoring based on hashtag characteristics
            const length = hashtag.length;
            let popularityScore = 0.5; // Default medium popularity
            let competitionLevel = 'medium';
            
            // Shorter hashtags tend to be more popular but more competitive
            if (length <= 10) {
                popularityScore = 0.8;
                competitionLevel = 'high';
            } else if (length <= 15) {
                popularityScore = 0.6;
                competitionLevel = 'medium';
            } else {
                popularityScore = 0.4;
                competitionLevel = 'low';
            }
            
            // Adjust based on common patterns
            if (hashtag.includes('tips') || hashtag.includes('daily')) {
                popularityScore += 0.1;
            }
            
            return {
                hashtag,
                popularity_score: Math.min(popularityScore, 1.0),
                competition_level: competitionLevel,
                engagement_potential: popularityScore * 0.9,
                category: this.categorizeHashtag(hashtag, popularityScore)
            };
        });
    }

    // Categorize hashtag based on characteristics
    categorizeHashtag(hashtag, popularityScore) {
        if (popularityScore >= 0.8) return 'broad';
        if (popularityScore >= 0.6) return 'niche';
        return 'micro';
    }

    // Generate hashtag recommendations
    generateHashtagRecommendations(existingHashtags, suggestedHashtags) {
        const recommendations = [];
        
        // Analyze current hashtag mix
        const currentMix = this.analyzeCurrentMix(existingHashtags);
        
        // Recommend improvements
        if (currentMix.broad < 2) {
            recommendations.push({
                type: 'add_broad',
                message: 'Add more broad hashtags to increase reach',
                priority: 'high'
            });
        }
        
        if (currentMix.micro < 3) {
            recommendations.push({
                type: 'add_micro',
                message: 'Add micro hashtags to reduce competition',
                priority: 'medium'
            });
        }
        
        if (currentMix.total > 20) {
            recommendations.push({
                type: 'reduce_count',
                message: 'Consider reducing hashtag count for better engagement',
                priority: 'medium'
            });
        }
        
        return recommendations;
    }

    // Analyze current hashtag mix
    analyzeCurrentMix(hashtags) {
        return {
            total: hashtags.length,
            broad: hashtags.filter(h => h.category === 'broad').length,
            niche: hashtags.filter(h => h.category === 'niche').length,
            micro: hashtags.filter(h => h.category === 'micro').length,
            trending: hashtags.filter(h => h.category === 'trending').length
        };
    }

    // Save hashtag combination
    async saveHashtagCombination(combination) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO hashtag_combinations 
                (name, description, niche_id, hashtags)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(query, [
                combination.name,
                combination.description,
                combination.niche_id || null,
                JSON.stringify(combination.hashtags)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get saved hashtag combinations
    async getSavedCombinations(nicheId = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT hc.*, n.name as niche_name
                FROM hashtag_combinations hc
                LEFT JOIN niches n ON hc.niche_id = n.id
            `;
            
            const params = [];
            
            if (nicheId) {
                query += ` WHERE hc.niche_id = ? OR hc.niche_id IS NULL`;
                params.push(nicheId);
            }
            
            query += ` ORDER BY hc.is_favorite DESC, hc.usage_count DESC, hc.created_at DESC`;

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse JSON hashtags
                    const combinations = rows.map(row => ({
                        ...row,
                        hashtags: JSON.parse(row.hashtags)
                    }));
                    resolve(combinations);
                }
            });
        });
    }
}

module.exports = new HashtagResearchService();
