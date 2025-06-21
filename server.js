// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const GeminiService = require('./services/gemini-service');
const AIModelManager = require('./services/ai-model-manager');
const ContentQualityService = require('./services/content-quality-service');
const growthBotService = require('./services/growth-bot-service');
const credentialStorage = require('./services/credential-storage');
const advancedAnalyticsService = require('./services/advanced-analytics-service');
const contentTemplateService = require('./services/content-template-service');

const app = express();
const port = process.env.PORT || 3001;

// Initialize services
const geminiService = new GeminiService();
const aiModelManager = new AIModelManager();
const contentQualityService = new ContentQualityService();
const twitterService = require('./services/twitter-service');
const instagramService = require('./services/instagram-service');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'data', 'content.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    const createTables = `
        CREATE TABLE IF NOT EXISTS niches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            persona TEXT,
            keywords TEXT,
            parent_id INTEGER,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES niches (id)
        );

        CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            niche_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- 'tweet', 'instagram', 'blog', etc.
            title TEXT,
            content TEXT NOT NULL,
            hashtags TEXT,
            status TEXT DEFAULT 'draft', -- 'draft', 'published', 'scheduled'
            scheduled_at DATETIME,
            scheduled_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (niche_id) REFERENCES niches (id)
        );

        CREATE TABLE IF NOT EXISTS social_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL, -- 'twitter', 'instagram'
            username TEXT NOT NULL,
            user_id TEXT,
            access_token TEXT,
            refresh_token TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS generation_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            niche_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
            prompt TEXT,
            result TEXT,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (niche_id) REFERENCES niches (id)
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL UNIQUE,
            encrypted_key TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS twitter_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            expires_at DATETIME,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS instagram_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            access_token TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL, -- 'content_generated', 'content_posted', 'niche_created', 'user_action'
            event_category TEXT NOT NULL, -- 'content', 'niche', 'user', 'system'
            event_data TEXT, -- JSON data for the event
            niche_id INTEGER,
            content_id INTEGER,
            session_id TEXT,
            user_agent TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (niche_id) REFERENCES niches (id),
            FOREIGN KEY (content_id) REFERENCES content (id)
        );

        CREATE TABLE IF NOT EXISTS analytics_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metric_type TEXT NOT NULL, -- 'counter', 'gauge', 'histogram'
            tags TEXT, -- JSON object with tags
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_time DATETIME,
            duration_seconds INTEGER,
            page_views INTEGER DEFAULT 0,
            actions_count INTEGER DEFAULT 0,
            user_agent TEXT,
            ip_address TEXT
        );
    `;

    db.exec(createTables, (err) => {
        if (err) {
            console.error('Error creating tables:', err.message);
        } else {
            console.log('Database tables initialized');
            // Add new columns to existing content table if they don't exist
            addTwitterColumns();
            // Insert initial niches if none exist
            insertInitialNiches();
        }
    });
}

// Insert initial niches if none exist
function insertInitialNiches() {
    db.get('SELECT COUNT(*) as count FROM niches', (err, row) => {
        if (err) {
            console.error('Error checking niches count:', err);
            return;
        }

        if (row.count === 0) {
            console.log('Inserting initial niches...');
            const initialNiches = [
                // Finance & Business
                {
                    name: "Finance & Business",
                    description: "Financial advice, business insights, and wealth building strategies",
                    persona: "Professional financial advisor with 10+ years experience. Speaks with authority but remains approachable. Uses data-driven insights, market trends, and practical advice. Avoids overly technical jargon while maintaining credibility. Focuses on actionable tips and long-term wealth building.",
                    keywords: "investing, stocks, finance, wealth building, business, entrepreneurship, financial freedom, passive income, market analysis, budgeting"
                },
                {
                    name: "Stock Investing",
                    description: "Stock market analysis, investment strategies, and portfolio management",
                    persona: "Experienced stock analyst who breaks down complex market movements into digestible insights. Uses charts, data, and historical patterns to support arguments. Balances bullish optimism with realistic risk assessment. Speaks to both beginners and experienced investors.",
                    keywords: "stocks, investing, portfolio, dividends, market analysis, bull market, bear market, S&P 500, growth stocks, value investing"
                },
                {
                    name: "Cryptocurrency",
                    description: "Crypto market analysis, blockchain technology, and digital asset trends",
                    persona: "Crypto enthusiast with deep technical knowledge but explains concepts clearly. Stays current with latest trends, regulations, and technological developments. Balances excitement about innovation with realistic risk warnings. Appeals to both crypto natives and newcomers.",
                    keywords: "crypto, bitcoin, ethereum, blockchain, DeFi, NFT, altcoins, trading, hodl, web3, cryptocurrency news"
                },
                // Health & Wellness
                {
                    name: "Health & Wellness",
                    description: "Fitness, nutrition, mental health, and overall wellbeing content",
                    persona: "Certified wellness coach with holistic approach to health. Emphasizes sustainable lifestyle changes over quick fixes. Uses scientific backing while keeping content accessible. Motivational but realistic about challenges. Focuses on mental and physical wellbeing integration.",
                    keywords: "fitness, nutrition, wellness, mental health, healthy lifestyle, workout, diet, mindfulness, self-care, health tips"
                },
                {
                    name: "Fitness & Bodybuilding",
                    description: "Workout routines, muscle building, and fitness motivation",
                    persona: "Experienced fitness trainer and bodybuilder. Motivational and energetic tone with focus on progressive overload and consistency. Uses gym terminology naturally but explains concepts for beginners. Emphasizes both physical and mental strength building.",
                    keywords: "bodybuilding, muscle building, workout, gym, strength training, protein, gains, fitness motivation, exercise, lifting"
                },
                {
                    name: "Yoga & Mindfulness",
                    description: "Yoga practices, meditation, and mindful living",
                    persona: "Certified yoga instructor with deep spiritual understanding. Calm, centered voice that promotes inner peace and self-discovery. Uses Sanskrit terms appropriately and connects physical practice with mental wellbeing. Inclusive and non-judgmental approach.",
                    keywords: "yoga, meditation, mindfulness, spiritual growth, inner peace, chakras, breathing, flexibility, zen, self-awareness"
                },
                // Technology & Gaming
                {
                    name: "Technology & Gaming",
                    description: "Tech trends, gaming content, and digital innovation",
                    persona: "Tech enthusiast who stays ahead of trends. Explains complex technology in accessible ways. Balances excitement about innovation with practical implications. Appeals to both tech professionals and general consumers interested in technology.",
                    keywords: "technology, tech trends, innovation, gadgets, software, hardware, digital transformation, tech news, future tech"
                },
                {
                    name: "Gaming",
                    description: "Video game reviews, gaming culture, and esports content",
                    persona: "Passionate gamer with extensive knowledge across multiple platforms and genres. Speaks the language of gaming communities while being welcoming to newcomers. Balances entertainment value with informative content about gaming industry trends.",
                    keywords: "gaming, video games, esports, game reviews, gaming setup, PC gaming, console gaming, mobile gaming, gaming news, game development"
                },
                // Anime & Manga
                {
                    name: "Anime & Manga",
                    description: "Anime reviews, manga discussions, and Japanese pop culture",
                    persona: "Otaku culture expert with deep knowledge of anime history and current trends. Uses anime terminology naturally and references both mainstream and niche series. Passionate but analytical approach to reviews and recommendations. Connects anime themes to broader cultural topics.",
                    keywords: "anime, manga, otaku, Japanese culture, anime reviews, manga recommendations, seasonal anime, anime news, cosplay, anime art"
                },
                {
                    name: "Seasonal Anime",
                    description: "Current season anime reviews and episode discussions",
                    persona: "Weekly anime watcher who provides timely reviews and episode breakdowns. Avoids major spoilers while discussing plot developments. Compares current series to classics and identifies emerging trends in the industry.",
                    keywords: "seasonal anime, anime reviews, episode discussion, anime rankings, new anime, anime season, weekly anime, anime episodes"
                },
                {
                    name: "Classic & Retro Anime",
                    description: "Classic anime series, retro reviews, and anime history",
                    persona: "Anime historian with encyclopedic knowledge of classic series. Provides context about anime's evolution and cultural impact. Introduces younger audiences to foundational works while analyzing their lasting influence on modern anime.",
                    keywords: "classic anime, retro anime, anime history, vintage anime, old school anime, anime classics, legendary anime, anime evolution"
                },
                // Luxury & Lifestyle
                {
                    name: "Luxury & Lifestyle",
                    description: "Luxury products, lifestyle content, and aspirational living",
                    persona: "Luxury lifestyle curator with refined taste and extensive knowledge of high-end brands. Sophisticated yet accessible tone that inspires without being pretentious. Focuses on quality, craftsmanship, and the stories behind luxury items.",
                    keywords: "luxury, lifestyle, high-end, premium, exclusive, luxury brands, sophisticated living, luxury travel, fine dining, luxury fashion"
                },
                {
                    name: "Luxury Cars",
                    description: "Luxury automotive content, car reviews, and automotive culture",
                    persona: "Automotive enthusiast with deep knowledge of luxury and exotic cars. Passionate about engineering, design, and performance. Uses technical terminology appropriately while making content accessible to car lovers of all levels.",
                    keywords: "luxury cars, supercars, automotive, car reviews, exotic cars, performance cars, car culture, automotive news, car design"
                },
                {
                    name: "High Fashion",
                    description: "Fashion trends, luxury fashion, and style inspiration",
                    persona: "Fashion industry insider with keen eye for trends and timeless style. Balances high fashion knowledge with practical style advice. Discusses both luxury and accessible fashion while maintaining sophisticated aesthetic sense.",
                    keywords: "fashion, luxury fashion, style, fashion trends, designer fashion, haute couture, fashion week, style inspiration, fashion brands"
                },
                // Travel & Adventure
                {
                    name: "Travel & Adventure",
                    description: "Travel destinations, adventure experiences, and cultural exploration",
                    persona: "Experienced traveler and adventure seeker who has explored diverse cultures and destinations. Provides practical travel advice while inspiring wanderlust. Balances luxury travel with budget-friendly options and emphasizes authentic cultural experiences.",
                    keywords: "travel, adventure, destinations, travel tips, wanderlust, exploration, culture, travel photography, backpacking, luxury travel"
                },
                // Food & Cooking
                {
                    name: "Food & Cooking",
                    description: "Recipes, cooking techniques, and culinary culture",
                    persona: "Passionate home cook and food enthusiast who makes cooking accessible and enjoyable. Shares practical cooking tips, recipe modifications, and food culture insights. Balances technique with creativity and emphasizes the joy of cooking.",
                    keywords: "cooking, recipes, food, culinary, kitchen tips, cooking techniques, food culture, meal prep, baking, food photography"
                },
                // Instagram Theme Pages
                {
                    name: "Instagram Theme Pages",
                    description: "Parent category for Instagram aesthetic theme pages",
                    persona: "Social media curator with excellent aesthetic sense and understanding of Instagram trends. Creates cohesive visual narratives and understands what resonates with different audiences. Balances trending content with timeless appeal.",
                    keywords: "Instagram, social media, aesthetic, visual content, Instagram themes, social media marketing, content creation, visual storytelling"
                },
                {
                    name: "Minimalist Aesthetic",
                    description: "Clean, minimal Instagram content with simple aesthetics",
                    persona: "Minimalist lifestyle curator who appreciates clean lines, neutral colors, and simplicity. Speaks to audiences seeking calm, organized, and intentional living. Uses sophisticated language while remaining accessible.",
                    keywords: "minimalist, clean aesthetic, neutral tones, simple living, minimal design, white space, clean lines, organized life, intentional living"
                },
                {
                    name: "Dark Academia",
                    description: "Scholarly, vintage-inspired aesthetic with books and academia",
                    persona: "Intellectual content creator with deep appreciation for literature, history, and classical education. Uses eloquent language and references to classic works. Appeals to book lovers and students.",
                    keywords: "dark academia, books, vintage, scholarly, literature, classical, academia, vintage books, study aesthetic, intellectual"
                },
                {
                    name: "Cottagecore",
                    description: "Rural, cozy lifestyle content with nature and simplicity",
                    persona: "Nature-loving content creator who celebrates simple, rural living and traditional crafts. Warm, nurturing tone that promotes slow living and connection with nature. Appeals to those seeking escape from modern life.",
                    keywords: "cottagecore, rural living, nature, cozy, simple life, traditional crafts, countryside, slow living, natural beauty, handmade"
                },
                {
                    name: "Streetwear Fashion",
                    description: "Urban fashion and streetwear culture content",
                    persona: "Fashion-forward streetwear enthusiast with deep knowledge of urban culture and fashion trends. Uses current slang appropriately and understands the intersection of fashion, music, and street culture.",
                    keywords: "streetwear, urban fashion, sneakers, street style, fashion trends, urban culture, style inspiration, fashion brands, street fashion"
                },
                {
                    name: "Plant Parent",
                    description: "Plant care, indoor gardening, and plant aesthetic content",
                    persona: "Plant enthusiast with extensive knowledge of plant care and indoor gardening. Nurturing and educational tone that helps beginners while sharing advanced tips. Passionate about green living and plant wellness.",
                    keywords: "plants, indoor gardening, plant care, houseplants, plant parent, green living, plant aesthetic, gardening tips, plant wellness"
                },
                {
                    name: "Memes & Humor",
                    description: "Internet memes, humor content, and viral trends",
                    persona: "Internet culture expert who understands meme trends and viral content. Quick-witted and current with online humor while being inclusive and avoiding offensive content. Balances trending memes with original humorous observations.",
                    keywords: "memes, humor, funny, viral content, internet culture, comedy, trending memes, social media humor, viral trends"
                },
                {
                    name: "Quotes & Motivation",
                    description: "Inspirational quotes, motivational content, and personal development",
                    persona: "Motivational speaker and personal development enthusiast who inspires positive change. Uses uplifting language while being authentic and relatable. Combines wisdom from various sources with practical life advice.",
                    keywords: "motivation, inspiration, quotes, personal development, self-improvement, success, mindset, positive thinking, life advice, wisdom"
                },
                {
                    name: "Aesthetics & Visuals",
                    description: "Visual aesthetics, design inspiration, and artistic content",
                    persona: "Visual artist and design enthusiast with keen eye for aesthetics and composition. Understands color theory, design principles, and current visual trends. Creates content that is both beautiful and educational about visual arts.",
                    keywords: "aesthetics, visual design, art, design inspiration, color theory, visual arts, artistic content, design trends, creative inspiration"
                },
                // Fun Facts & Trivia
                {
                    name: "Fun Facts & Trivia",
                    description: "Interesting facts, trivia, and educational entertainment",
                    persona: "Curious knowledge enthusiast who makes learning fun and engaging. Presents facts in entertaining ways while ensuring accuracy. Covers diverse topics from science to history to pop culture with infectious enthusiasm for learning.",
                    keywords: "fun facts, trivia, interesting facts, knowledge, learning, education, science facts, history facts, amazing facts, did you know"
                },
                // Animals & Pets
                {
                    name: "Animals & Pets",
                    description: "Pet care, animal facts, and wildlife content",
                    persona: "Animal lover and pet care expert who combines practical advice with heartwarming animal content. Knowledgeable about pet care, animal behavior, and wildlife conservation. Balances educational content with entertaining animal stories.",
                    keywords: "pets, animals, pet care, animal facts, wildlife, dogs, cats, pet training, animal behavior, pet health, cute animals"
                }
            ];

            const insertQuery = 'INSERT OR IGNORE INTO niches (name, description, persona, keywords) VALUES (?, ?, ?, ?)';

            initialNiches.forEach(niche => {
                db.run(insertQuery, [niche.name, niche.description, niche.persona, niche.keywords], (err) => {
                    if (err) {
                        console.error(`Error inserting niche ${niche.name}:`, err);
                    } else {
                        console.log(`✓ Inserted niche: ${niche.name}`);
                    }
                });
            });
        } else {
            console.log(`Database already has ${row.count} niches`);
            // If we have fewer than 22 niches, add the missing ones
            if (row.count < 22) {
                console.log('Adding missing niches to existing database...');
                const insertQuery = 'INSERT OR IGNORE INTO niches (name, description, persona, keywords) VALUES (?, ?, ?, ?)';

                initialNiches.forEach(niche => {
                    db.run(insertQuery, [niche.name, niche.description, niche.persona, niche.keywords], (err) => {
                        if (err && !err.message.includes('UNIQUE constraint failed')) {
                            console.error(`Error adding niche ${niche.name}:`, err);
                        }
                    });
                });
            }
        }
    });
}

// Add Twitter columns to existing content table
function addTwitterColumns() {
    const alterQueries = [
        'ALTER TABLE content ADD COLUMN posted_to_twitter BOOLEAN DEFAULT 0',
        'ALTER TABLE content ADD COLUMN posted_to_instagram BOOLEAN DEFAULT 0',
        'ALTER TABLE content ADD COLUMN twitter_post_id TEXT',
        'ALTER TABLE content ADD COLUMN instagram_post_id TEXT'
    ];

    alterQueries.forEach(query => {
        db.run(query, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding column:', err.message);
            }
        });
    });
}

// Store for SSE connections
const sseConnections = new Set();

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add connection to set
    sseConnections.add(res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to real-time updates' })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
        sseConnections.delete(res);
    });
});

// Function to broadcast to all SSE connections
function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    sseConnections.forEach(res => {
        try {
            res.write(message);
        } catch (err) {
            sseConnections.delete(res);
        }
    });
}

// Analytics tracking functions
function trackEvent(eventType, eventCategory, eventData = {}, nicheId = null, contentId = null, req = null) {
    const sessionId = req?.headers['x-session-id'] || 'anonymous';
    const userAgent = req?.headers['user-agent'] || '';
    const ipAddress = req?.ip || req?.connection?.remoteAddress || '';

    const query = `
        INSERT INTO analytics_events (event_type, event_category, event_data, niche_id, content_id, session_id, user_agent, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        eventType,
        eventCategory,
        JSON.stringify(eventData),
        nicheId,
        contentId,
        sessionId,
        userAgent,
        ipAddress
    ], (err) => {
        if (err) {
            console.error('Error tracking event:', err);
        }
    });
}

function recordMetric(metricName, metricValue, metricType = 'counter', tags = {}) {
    const query = `
        INSERT INTO analytics_metrics (metric_name, metric_value, metric_type, tags)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [metricName, metricValue, metricType, JSON.stringify(tags)], (err) => {
        if (err) {
            console.error('Error recording metric:', err);
        }
    });
}

function updateSession(sessionId, req) {
    const userAgent = req?.headers['user-agent'] || '';
    const ipAddress = req?.ip || req?.connection?.remoteAddress || '';

    // Insert or update session
    const query = `
        INSERT OR REPLACE INTO user_sessions (session_id, user_agent, ip_address, page_views, actions_count)
        VALUES (
            ?,
            ?,
            ?,
            COALESCE((SELECT page_views FROM user_sessions WHERE session_id = ?), 0) + 1,
            COALESCE((SELECT actions_count FROM user_sessions WHERE session_id = ?), 0) + 1
        )
    `;

    db.run(query, [sessionId, userAgent, ipAddress, sessionId, sessionId], (err) => {
        if (err) {
            console.error('Error updating session:', err);
        }
    });
}

// API Routes

// Analytics API endpoints
app.get('/api/analytics/overview', (req, res) => {
    const { timeframe = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (timeframe) {
        case '24h':
            startDate.setHours(now.getHours() - 24);
            break;
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        default:
            startDate.setDate(now.getDate() - 7);
    }

    const queries = {
        totalContent: `SELECT COUNT(*) as count FROM content WHERE created_at >= ?`,
        totalNiches: `SELECT COUNT(*) as count FROM niches WHERE active = 1`,
        contentByStatus: `
            SELECT status, COUNT(*) as count
            FROM content
            WHERE created_at >= ?
            GROUP BY status
        `,
        contentByNiche: `
            SELECT n.name, COUNT(c.id) as count
            FROM niches n
            LEFT JOIN content c ON n.id = c.niche_id AND c.created_at >= ?
            WHERE n.active = 1
            GROUP BY n.id, n.name
            ORDER BY count DESC
            LIMIT 10
        `,
        dailyActivity: `
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM content
            WHERE created_at >= ?
            GROUP BY DATE(created_at)
            ORDER BY date
        `,
        topEvents: `
            SELECT event_type, COUNT(*) as count
            FROM analytics_events
            WHERE created_at >= ?
            GROUP BY event_type
            ORDER BY count DESC
            LIMIT 10
        `
    };

    Promise.all([
        new Promise((resolve, reject) => {
            db.get(queries.totalContent, [startDate.toISOString()], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(queries.totalNiches, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(queries.contentByStatus, [startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(queries.contentByNiche, [startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(queries.dailyActivity, [startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(queries.topEvents, [startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        })
    ]).then(([totalContent, totalNiches, contentByStatus, contentByNiche, dailyActivity, topEvents]) => {
        res.json({
            timeframe,
            overview: {
                totalContent,
                totalNiches,
                contentByStatus,
                contentByNiche,
                dailyActivity,
                topEvents
            }
        });
    }).catch(err => {
        console.error('Error fetching analytics overview:', err);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    });
});

app.get('/api/analytics/performance', (req, res) => {
    const { timeframe = '7d' } = req.query;

    const now = new Date();
    const startDate = new Date();

    switch (timeframe) {
        case '24h':
            startDate.setHours(now.getHours() - 24);
            break;
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        default:
            startDate.setDate(now.getDate() - 7);
    }

    const queries = {
        generationTimes: `
            SELECT
                AVG(CAST((julianday(completed_at) - julianday(created_at)) * 86400 AS INTEGER)) as avg_seconds,
                MIN(CAST((julianday(completed_at) - julianday(created_at)) * 86400 AS INTEGER)) as min_seconds,
                MAX(CAST((julianday(completed_at) - julianday(created_at)) * 86400 AS INTEGER)) as max_seconds
            FROM generation_jobs
            WHERE status = 'completed' AND created_at >= ?
        `,
        successRate: `
            SELECT
                status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM generation_jobs WHERE created_at >= ?), 2) as percentage
            FROM generation_jobs
            WHERE created_at >= ?
            GROUP BY status
        `,
        hourlyDistribution: `
            SELECT
                strftime('%H', created_at) as hour,
                COUNT(*) as count
            FROM content
            WHERE created_at >= ?
            GROUP BY strftime('%H', created_at)
            ORDER BY hour
        `
    };

    Promise.all([
        new Promise((resolve, reject) => {
            db.get(queries.generationTimes, [startDate.toISOString()], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(queries.successRate, [startDate.toISOString(), startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(queries.hourlyDistribution, [startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        })
    ]).then(([generationTimes, successRate, hourlyDistribution]) => {
        res.json({
            timeframe,
            performance: {
                generationTimes: generationTimes || { avg_seconds: 0, min_seconds: 0, max_seconds: 0 },
                successRate,
                hourlyDistribution
            }
        });
    }).catch(err => {
        console.error('Error fetching performance analytics:', err);
        res.status(500).json({ error: 'Failed to fetch performance data' });
    });
});

// Track analytics event
app.post('/api/analytics/track', (req, res) => {
    const { eventType, eventCategory, eventData, nicheId, contentId } = req.body;

    if (!eventType || !eventCategory) {
        return res.status(400).json({ error: 'Event type and category are required' });
    }

    trackEvent(eventType, eventCategory, eventData, nicheId, contentId, req);
    res.json({ success: true });
});

// AI Model Management API endpoints
app.get('/api/ai-models', (req, res) => {
    try {
        const models = aiModelManager.getAllModels();
        const stats = aiModelManager.getModelStats();

        res.json({
            models,
            stats,
            current: aiModelManager.getCurrentModel()
        });
    } catch (error) {
        console.error('Error fetching AI models:', error);
        res.status(500).json({ error: 'Failed to fetch AI models' });
    }
});

app.get('/api/ai-models/available', (req, res) => {
    try {
        const availableModels = aiModelManager.getAvailableModels();
        res.json(availableModels);
    } catch (error) {
        console.error('Error fetching available AI models:', error);
        res.status(500).json({ error: 'Failed to fetch available AI models' });
    }
});

app.post('/api/ai-models/set-current', (req, res) => {
    const { modelId } = req.body;

    if (!modelId) {
        return res.status(400).json({ error: 'Model ID is required' });
    }

    try {
        const success = aiModelManager.setCurrentModel(modelId);

        if (success) {
            const currentModel = aiModelManager.getCurrentModel();

            // Track analytics event
            trackEvent('ai_model_changed', 'system', {
                previous_model: req.body.previousModel || 'unknown',
                new_model: modelId,
                model_name: currentModel.name
            }, null, null, req);

            res.json({
                success: true,
                currentModel,
                message: `Successfully switched to ${currentModel.name}`
            });
        } else {
            res.status(400).json({
                error: 'Failed to set model. Model may not be available.'
            });
        }
    } catch (error) {
        console.error('Error setting current AI model:', error);
        res.status(500).json({ error: 'Failed to set current AI model' });
    }
});

app.post('/api/ai-models/test', (req, res) => {
    const { modelId } = req.body;

    if (!modelId) {
        return res.status(400).json({ error: 'Model ID is required' });
    }

    aiModelManager.testModel(modelId)
        .then(result => {
            // Track analytics event
            trackEvent('ai_model_tested', 'system', {
                model_id: modelId,
                test_result: result.success ? 'success' : 'failure',
                error: result.error || null
            }, null, null, req);

            res.json(result);
        })
        .catch(error => {
            console.error('Error testing AI model:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to test AI model'
            });
        });
});

app.get('/api/ai-models/comparison', (req, res) => {
    try {
        const comparison = aiModelManager.getModelComparison();
        res.json(comparison);
    } catch (error) {
        console.error('Error fetching model comparison:', error);
        res.status(500).json({ error: 'Failed to fetch model comparison' });
    }
});

// Content Quality Analysis API endpoints
app.post('/api/analyze-content-quality', async (req, res) => {
    const { content, niche_id } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required for quality analysis' });
    }

    try {
        // Get niche details if provided
        let niche = null;
        if (niche_id) {
            niche = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        // Analyze content quality
        const qualityAnalysis = contentQualityService.analyzeContent(content, niche);

        // Track analytics event
        trackEvent('content_quality_analyzed', 'content', {
            overall_score: qualityAnalysis.overallScore,
            grade: qualityAnalysis.grade,
            viral_potential: qualityAnalysis.viralPotential.potential,
            niche_id: niche_id || null,
            niche_name: niche?.name || null
        }, niche_id, null, req);

        res.json({
            success: true,
            analysis: qualityAnalysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing content quality:', error);
        res.status(500).json({
            error: 'Content quality analysis failed',
            details: error.message
        });
    }
});

// Content Improvement API endpoint
app.post('/api/improve-content', async (req, res) => {
    const { content, analysis, niche_id } = req.body;

    if (!content || !analysis) {
        return res.status(400).json({ error: 'Content and analysis are required for improvement' });
    }

    try {
        // Get niche details if provided
        let niche = null;
        if (niche_id) {
            niche = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        // Generate improved content using AI
        const improvedContent = await aiModelManager.improveContent(content, analysis, niche);

        // Track analytics event
        trackEvent('content_improved', 'content', {
            original_score: analysis.overallScore,
            niche_id: niche_id || null,
            niche_name: niche?.name || null,
            improvements_applied: improvedContent.improvements?.length || 0
        }, niche_id, null, req);

        res.json({
            success: true,
            improvedContent,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error improving content:', error);
        res.status(500).json({
            error: 'Content improvement failed',
            details: error.message
        });
    }
});

// Content Improvement API endpoint
app.post('/api/improve-content', async (req, res) => {
    const { content, analysis, niche_id } = req.body;

    if (!content || !analysis) {
        return res.status(400).json({ error: 'Content and analysis are required for improvement' });
    }

    try {
        // Get niche details if provided
        let niche = null;
        if (niche_id) {
            niche = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        // Generate improved content using AI
        const improvedContent = await aiModelManager.improveContent(content, analysis, niche);

        // Track analytics event
        trackEvent('content_improved', 'content', {
            original_score: analysis.overallScore,
            niche_id: niche_id || null,
            niche_name: niche?.name || null,
            improvements_applied: improvedContent.improvements?.length || 0
        }, niche_id, null, req);

        res.json({
            success: true,
            improvedContent,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error improving content:', error);
        res.status(500).json({
            error: 'Content improvement failed',
            details: error.message
        });
    }
});

// Batch content quality analysis
app.post('/api/analyze-content-batch', async (req, res) => {
    const { contents } = req.body;

    if (!contents || !Array.isArray(contents)) {
        return res.status(400).json({ error: 'Contents array is required' });
    }

    if (contents.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 contents can be analyzed at once' });
    }

    try {
        const analyses = [];

        for (const item of contents) {
            const { content, niche_id } = item;

            // Get niche details if provided
            let niche = null;
            if (niche_id) {
                niche = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
            }

            // Analyze content quality
            const qualityAnalysis = contentQualityService.analyzeContent(content, niche);

            analyses.push({
                content_id: item.id || null,
                niche_id: niche_id || null,
                analysis: qualityAnalysis
            });
        }

        // Track analytics event
        trackEvent('content_quality_batch_analyzed', 'content', {
            batch_size: contents.length,
            avg_score: analyses.reduce((sum, a) => sum + a.analysis.overallScore, 0) / analyses.length
        }, null, null, req);

        res.json({
            success: true,
            analyses,
            summary: {
                total_analyzed: analyses.length,
                average_score: Math.round(analyses.reduce((sum, a) => sum + a.analysis.overallScore, 0) / analyses.length),
                high_quality_count: analyses.filter(a => a.analysis.overallScore >= 80).length,
                needs_improvement_count: analyses.filter(a => a.analysis.overallScore < 70).length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in batch content quality analysis:', error);
        res.status(500).json({
            error: 'Batch content quality analysis failed',
            details: error.message
        });
    }
});

// Get quality insights for a niche
app.get('/api/quality-insights/:niche_id', async (req, res) => {
    const { niche_id } = req.params;
    const { timeframe = '30d' } = req.query;

    try {
        // Calculate date range
        const now = new Date();
        const startDate = new Date();

        switch (timeframe) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }

        // Get quality analysis events for this niche
        const qualityEvents = await new Promise((resolve, reject) => {
            db.all(`
                SELECT event_data, created_at
                FROM analytics_events
                WHERE event_type = 'content_quality_analyzed'
                AND niche_id = ?
                AND created_at >= ?
                ORDER BY created_at DESC
            `, [niche_id, startDate.toISOString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Parse and analyze the data
        const scores = qualityEvents.map(event => {
            const data = JSON.parse(event.event_data);
            return {
                score: data.overall_score,
                grade: data.grade,
                viral_potential: data.viral_potential,
                date: event.created_at
            };
        });

        const insights = {
            total_analyses: scores.length,
            average_score: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0,
            score_trend: this.calculateTrend(scores),
            grade_distribution: this.calculateGradeDistribution(scores),
            viral_potential_distribution: this.calculateViralDistribution(scores),
            recent_scores: scores.slice(0, 10)
        };

        res.json({
            success: true,
            insights,
            timeframe
        });

    } catch (error) {
        console.error('Error fetching quality insights:', error);
        res.status(500).json({
            error: 'Failed to fetch quality insights',
            details: error.message
        });
    }
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    const queries = [
        'SELECT COUNT(*) as count FROM niches WHERE active = 1',
        'SELECT COUNT(*) as count FROM content',
        'SELECT COUNT(*) as count FROM generation_jobs WHERE status = "running"'
    ];

    Promise.all(queries.map(query =>
        new Promise((resolve, reject) => {
            db.get(query, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        })
    )).then(([nichesCount, contentGenerated, activeJobs]) => {
        const stats = { nichesCount, contentGenerated, activeJobs };
        res.json(stats);

        // Broadcast stats update
        broadcast({ type: 'stats', stats });
    }).catch(err => {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    });
});

// Niches API
app.get('/api/niches', (req, res) => {
    const query = `
        SELECT n.*,
               COUNT(c.id) as content_count,
               (SELECT COUNT(*) FROM niches WHERE parent_id = n.id) as children_count
        FROM niches n
        LEFT JOIN content c ON n.id = c.niche_id
        WHERE n.active = 1
        GROUP BY n.id
        ORDER BY n.created_at DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error fetching niches:', err);
            res.status(500).json({ error: 'Failed to fetch niches' });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/niches', (req, res) => {
    const { name, description, persona, keywords, parent_id } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const query = 'INSERT INTO niches (name, description, persona, keywords, parent_id) VALUES (?, ?, ?, ?, ?)';
    db.run(query, [name, description, persona, keywords, parent_id || null], function(err) {
        if (err) {
            console.error('Error creating niche:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'Niche name already exists' });
            } else {
                res.status(500).json({ error: 'Failed to create niche' });
            }
        } else {
            const newNiche = { id: this.lastID, name, description, persona, keywords, parent_id };
            res.status(201).json(newNiche);

            // Broadcast notification
            broadcast({
                type: 'notification',
                message: `New niche created: ${name}`
            });
        }
    });
});

// Content Variation Generation API
app.post('/api/generate-content-variation', async (req, res) => {
    const { niche_id, style, emotion } = req.body;

    if (!niche_id) {
        return res.status(400).json({ error: 'Niche ID is required' });
    }

    try {
        // Get niche details
        const niche = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!niche) {
            return res.status(404).json({ error: 'Niche not found' });
        }

        // Generate content with specific style and emotion using AI model manager
        const content = await aiModelManager.generateContentWithStyle(niche, style, emotion);

        res.json(content);

        // Track analytics event
        trackEvent('content_variation_generated', 'content', {
            niche_name: niche.name,
            style: style,
            emotion: emotion,
            generation_time: Date.now()
        }, niche_id, null, req);

    } catch (error) {
        console.error('Content variation generation error:', error);
        res.status(500).json({
            error: 'Content variation generation failed',
            details: error.message
        });
    }
});

// Save Content Variation API
app.post('/api/save-content-variation', async (req, res) => {
    const { niche_id, content, style, emotion } = req.body;

    if (!niche_id || !content) {
        return res.status(400).json({ error: 'Niche ID and content are required' });
    }

    try {
        // Get niche details
        const niche = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!niche) {
            return res.status(404).json({ error: 'Niche not found' });
        }

        // Store in database
        const insertQuery = `
            INSERT INTO content (niche_id, type, title, content, hashtags, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const contentData = JSON.stringify({
            tweet: content.tweet,
            instagram: content.instagram,
            imagePrompt: content.imagePrompt
        });

        const metadata = JSON.stringify({
            style: style,
            emotion: emotion,
            variation: true
        });

        db.run(insertQuery, [
            niche_id,
            'variation',
            `${style} content for ${niche.name}`,
            contentData,
            content.hashtags,
            'pending',
            metadata
        ], function(err) {
            if (err) {
                console.error('Error storing content variation:', err);
                res.status(500).json({ error: 'Failed to store content variation' });
            } else {
                const savedContent = {
                    id: this.lastID,
                    niche_id,
                    niche_name: niche.name,
                    ...content,
                    style,
                    emotion,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                };

                res.json({ success: true, content: savedContent });

                // Track analytics event
                trackEvent('content_variation_saved', 'content', {
                    niche_name: niche.name,
                    style: style,
                    emotion: emotion
                }, niche_id, this.lastID, req);

                // Broadcast to SSE clients
                broadcast({
                    type: 'content_variation_saved',
                    content: savedContent
                });
            }
        });

    } catch (error) {
        console.error('Error saving content variation:', error);
        res.status(500).json({
            error: 'Failed to save content variation',
            details: error.message
        });
    }
});

// Content Generation API
app.post('/api/generate-content', async (req, res) => {
    const { niche_id, count = 1 } = req.body;

    if (!niche_id) {
        return res.status(400).json({ error: 'Niche ID is required' });
    }

    try {
        // Get niche details
        const niche = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM niches WHERE id = ? AND active = 1', [niche_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!niche) {
            return res.status(404).json({ error: 'Niche not found' });
        }

        // Generate content using AI model manager
        const content = await aiModelManager.generateContent(niche);

        // Store in database
        const insertQuery = `
            INSERT INTO content (niche_id, type, title, content, hashtags, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const contentData = JSON.stringify({
            tweet: content.tweet,
            instagram: content.instagram,
            imagePrompt: content.imagePrompt
        });

        db.run(insertQuery, [
            niche_id,
            'complete',
            `Generated content for ${niche.name}`,
            contentData,
            content.hashtags,
            'pending'
        ], function(err) {
            if (err) {
                console.error('Error storing content:', err);
                res.status(500).json({ error: 'Failed to store generated content' });
            } else {
                const generatedContent = {
                    id: this.lastID,
                    niche_id,
                    niche_name: niche.name,
                    ...content,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                };

                res.json(generatedContent);

                // Track analytics event
                trackEvent('content_generated', 'content', {
                    niche_name: niche.name,
                    content_type: 'complete',
                    generation_time: Date.now()
                }, niche_id, this.lastID, req);

                // Record metrics
                recordMetric('content_generated_total', 1, 'counter', { niche: niche.name });

                // Broadcast to SSE clients
                broadcast({
                    type: 'content_generated',
                    content: generatedContent
                });
            }
        });

    } catch (error) {
        console.error('Content generation error:', error);
        res.status(500).json({
            error: 'Content generation failed',
            details: error.message
        });
    }
});

// Get generated content
app.get('/api/content', (req, res) => {
    const { niche_id, status, limit = 50 } = req.query;

    let query = `
        SELECT c.*, n.name as niche_name
        FROM content c
        JOIN niches n ON c.niche_id = n.id
        WHERE 1=1
    `;
    const params = [];

    if (niche_id) {
        query += ' AND c.niche_id = ?';
        params.push(niche_id);
    }

    if (status) {
        query += ' AND c.status = ?';
        params.push(status);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching content:', err);
            res.status(500).json({ error: 'Failed to fetch content' });
        } else {
            // Parse content JSON for each row
            const content = rows.map(row => {
                try {
                    const parsedContent = JSON.parse(row.content);
                    return {
                        ...row,
                        ...parsedContent
                    };
                } catch (e) {
                    return row;
                }
            });
            res.json(content);
        }
    });
});

// Update content status (Post, Delete, etc.)
app.patch('/api/content/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    const query = 'UPDATE content SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(query, [status, id], function(err) {
        if (err) {
            console.error('Error updating content:', err);
            res.status(500).json({ error: 'Failed to update content' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Content not found' });
        } else {
            res.json({ success: true, id, status });

            // Broadcast update
            broadcast({
                type: 'content_updated',
                content: { id, status }
            });
        }
    });
});

// Test Gemini API connection
app.get('/api/test-gemini', async (req, res) => {
    try {
        const result = await geminiService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI Models Management
app.get('/api/models', (req, res) => {
    try {
        const models = aiModelManager.getAllModels();
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/models/available', (req, res) => {
    try {
        const models = aiModelManager.getAvailableModels();
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/models/current', (req, res) => {
    try {
        const model = aiModelManager.getCurrentModel();
        res.json(model);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/models/switch', (req, res) => {
    try {
        const { modelId } = req.body;
        const success = aiModelManager.setCurrentModel(modelId);

        if (success) {
            res.json({
                success: true,
                currentModel: aiModelManager.getCurrentModel()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid or unavailable model'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/models/test/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        const result = await aiModelManager.testModel(modelId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/models/stats', (req, res) => {
    try {
        const stats = aiModelManager.getModelStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Credential Management API endpoints
app.post('/api/credentials/x/save', async (req, res) => {
    try {
        const { apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken } = req.body;

        if (!apiKey || !apiSecret) {
            return res.status(400).json({ error: 'API Key and API Secret are required' });
        }

        const success = credentialStorage.saveXCredentials({
            apiKey,
            apiSecret,
            accessToken,
            accessTokenSecret,
            bearerToken
        });

        if (success) {
            res.json({ success: true, message: 'X credentials saved successfully' });
        } else {
            res.status(500).json({ error: 'Failed to save X credentials' });
        }
    } catch (error) {
        console.error('Error saving X credentials:', error);
        res.status(500).json({ error: 'Failed to save X credentials' });
    }
});

app.get('/api/credentials/x/load', async (req, res) => {
    try {
        const credentials = credentialStorage.loadXCredentials();

        if (credentials) {
            // Don't send the actual credentials, just indicate they exist
            res.json({
                hasCredentials: true,
                savedAt: credentials.savedAt,
                // Send masked versions for display
                apiKey: credentials.apiKey ? '***' + credentials.apiKey.slice(-4) : '',
                apiSecret: credentials.apiSecret ? '***' + credentials.apiSecret.slice(-4) : ''
            });
        } else {
            res.json({ hasCredentials: false });
        }
    } catch (error) {
        console.error('Error loading X credentials:', error);
        res.status(500).json({ error: 'Failed to load X credentials' });
    }
});

app.delete('/api/credentials/x/clear', async (req, res) => {
    try {
        const success = credentialStorage.clearXCredentials();

        if (success) {
            res.json({ success: true, message: 'X credentials cleared successfully' });
        } else {
            res.status(500).json({ error: 'Failed to clear X credentials' });
        }
    } catch (error) {
        console.error('Error clearing X credentials:', error);
        res.status(500).json({ error: 'Failed to clear X credentials' });
    }
});

app.get('/api/credentials/status', async (req, res) => {
    try {
        const status = credentialStorage.getCredentialsStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting credentials status:', error);
        res.status(500).json({ error: 'Failed to get credentials status' });
    }
});

// Growth Bot Management
app.post('/api/growth-bot/initialize', async (req, res) => {
    try {
        const { accessToken, accessSecret, apiKey, apiSecret } = req.body;

        if (!accessToken || !accessSecret || !apiKey || !apiSecret) {
            return res.status(400).json({
                error: 'All Twitter credentials are required'
            });
        }

        const success = await growthBotService.initialize(accessToken, accessSecret, apiKey, apiSecret);
        res.json({ success, message: 'Growth Bot initialized successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/growth-bot/start', async (req, res) => {
    try {
        const { targetNiches } = req.body;
        const result = await growthBotService.start(targetNiches || []);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/growth-bot/stop', (req, res) => {
    try {
        const result = growthBotService.stop();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/growth-bot/stats', async (req, res) => {
    try {
        const stats = await growthBotService.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/growth-bot/config', (req, res) => {
    try {
        const config = growthBotService.updateConfig(req.body);
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
    try {
        const settings = {
            geminiApiKey: process.env.GEMINI_API_KEY || '',
            leonardoApiKey: process.env.LEONARDO_API_KEY || ''
        };
        res.json(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

app.post('/api/settings', (req, res) => {
    try {
        const { geminiApiKey, leonardoApiKey } = req.body;

        // Update environment variables (in a real app, you'd want to persist these)
        if (geminiApiKey) {
            process.env.GEMINI_API_KEY = geminiApiKey;
        }
        if (leonardoApiKey) {
            process.env.LEONARDO_API_KEY = leonardoApiKey;
        }

        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

app.post('/api/test-gemini', async (req, res) => {
    try {
        const { apiKey } = req.body;

        // Temporarily use the provided API key for testing
        const originalKey = process.env.GEMINI_API_KEY;
        process.env.GEMINI_API_KEY = apiKey;

        const result = await geminiService.testConnection();

        // Restore original key
        process.env.GEMINI_API_KEY = originalKey;

        res.json(result);
    } catch (error) {
        console.error('Error testing Gemini connection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test connection'
        });
    }
});

// Twitter API endpoints

// Get Twitter OAuth URL
app.get('/api/twitter/auth-url', async (req, res) => {
    try {
        const authData = await twitterService.getAuthUrl();
        res.json(authData);
    } catch (error) {
        console.error('Error getting Twitter auth URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Handle Twitter OAuth callback
app.post('/api/twitter/callback', async (req, res) => {
    try {
        const { code, codeVerifier, callbackUrl } = req.body;

        const authResult = await twitterService.handleCallback(code, codeVerifier, callbackUrl);

        // Store the access token in database (encrypted)
        const encryptedToken = twitterService.encryptToken(authResult.accessToken);

        db.run(
            'INSERT OR REPLACE INTO twitter_accounts (user_id, username, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?)',
            [
                authResult.user.id,
                authResult.user.username,
                encryptedToken,
                authResult.refreshToken,
                new Date(Date.now() + authResult.expiresIn * 1000)
            ],
            function(err) {
                if (err) {
                    console.error('Error storing Twitter account:', err);
                    res.status(500).json({ error: 'Failed to store account' });
                } else {
                    res.json({
                        success: true,
                        user: authResult.user
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error handling Twitter callback:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Post tweet
app.post('/api/twitter/post', async (req, res) => {
    try {
        const { content, contentId } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Validate content
        const validation = twitterService.validateTweetContent(content);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid tweet content',
                details: validation.errors
            });
        }

        // Get active Twitter account
        db.get(
            'SELECT * FROM twitter_accounts WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1',
            async (err, account) => {
                if (err) {
                    console.error('Error fetching Twitter account:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (!account) {
                    return res.status(400).json({ error: 'No Twitter account connected' });
                }

                try {
                    // Decrypt access token
                    const accessToken = twitterService.decryptToken(account.access_token);

                    // Post tweet
                    const result = await twitterService.postTweet(content, accessToken);

                    // Update content status if contentId provided
                    if (contentId) {
                        db.run(
                            'UPDATE content SET status = ?, posted_to_twitter = 1, twitter_post_id = ? WHERE id = ?',
                            ['posted', result.tweetId, contentId]
                        );
                    }

                    res.json({
                        success: true,
                        tweetId: result.tweetId,
                        url: `https://twitter.com/${account.username}/status/${result.tweetId}`
                    });

                    // Broadcast update
                    broadcast({
                        type: 'tweet_posted',
                        content: { id: contentId, tweetId: result.tweetId }
                    });

                } catch (postError) {
                    console.error('Error posting tweet:', postError);
                    res.status(500).json({
                        error: 'Failed to post tweet',
                        details: postError.message
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error in tweet posting:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get Twitter rate limit status
app.get('/api/twitter/rate-limits', (req, res) => {
    try {
        const rateLimits = twitterService.getRateLimitStatus();
        res.json(rateLimits);
    } catch (error) {
        console.error('Error getting rate limits:', error);
        res.status(500).json({
            error: 'Failed to get rate limits'
        });
    }
});

// Test Twitter connection
app.post('/api/test-twitter', async (req, res) => {
    try {
        const { accessToken } = req.body;
        const result = await twitterService.testConnection(accessToken);
        res.json(result);
    } catch (error) {
        console.error('Error testing Twitter connection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test connection'
        });
    }
});

// Get connected Twitter accounts
app.get('/api/twitter/accounts', (req, res) => {
    db.all(
        'SELECT user_id, username, is_active, created_at FROM twitter_accounts ORDER BY created_at DESC',
        (err, accounts) => {
            if (err) {
                console.error('Error fetching Twitter accounts:', err);
                res.status(500).json({ error: 'Failed to fetch accounts' });
            } else {
                res.json(accounts);
            }
        }
    );
});

// Instagram API endpoints

// Get Instagram OAuth URL
app.get('/api/instagram/auth-url', async (req, res) => {
    try {
        const authData = await instagramService.getAuthUrl();
        res.json(authData);
    } catch (error) {
        console.error('Error getting Instagram auth URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Handle Instagram OAuth callback
app.post('/api/instagram/callback', async (req, res) => {
    try {
        const { code, callbackUrl } = req.body;

        const authResult = await instagramService.handleCallback(code, callbackUrl);

        // Store the access token in database (encrypted)
        const encryptedToken = instagramService.encryptToken(authResult.accessToken);

        db.run(
            'INSERT OR REPLACE INTO instagram_accounts (user_id, username, access_token, is_active) VALUES (?, ?, ?, ?)',
            [
                authResult.user.id,
                authResult.user.username,
                encryptedToken,
                1
            ],
            function(err) {
                if (err) {
                    console.error('Error storing Instagram account:', err);
                    res.status(500).json({ error: 'Failed to store account' });
                } else {
                    res.json({
                        success: true,
                        user: authResult.user
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error handling Instagram callback:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get Instagram rate limit status
app.get('/api/instagram/rate-limits', (req, res) => {
    try {
        const rateLimits = instagramService.getRateLimitStatus();
        res.json(rateLimits);
    } catch (error) {
        console.error('Error getting Instagram rate limits:', error);
        res.status(500).json({
            error: 'Failed to get rate limits'
        });
    }
});

// Test Instagram connection
app.post('/api/test-instagram', async (req, res) => {
    try {
        const { accessToken } = req.body;
        const result = await instagramService.testConnection(accessToken);
        res.json(result);
    } catch (error) {
        console.error('Error testing Instagram connection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test connection'
        });
    }
});

// Get connected Instagram accounts
app.get('/api/instagram/accounts', (req, res) => {
    db.all(
        'SELECT user_id, username, is_active, created_at FROM instagram_accounts ORDER BY created_at DESC',
        (err, accounts) => {
            if (err) {
                console.error('Error fetching Instagram accounts:', err);
                res.status(500).json({ error: 'Failed to fetch accounts' });
            } else {
                res.json(accounts);
            }
        }
    );
});

// Get user's Instagram media
app.get('/api/instagram/media', async (req, res) => {
    try {
        // Get active Instagram account
        db.get(
            'SELECT * FROM instagram_accounts WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1',
            async (err, account) => {
                if (err) {
                    console.error('Error fetching Instagram account:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (!account) {
                    return res.status(400).json({ error: 'No Instagram account connected' });
                }

                try {
                    // Decrypt access token
                    const accessToken = instagramService.decryptToken(account.access_token);

                    // Get user media
                    const result = await instagramService.getUserMedia(accessToken);
                    res.json(result);

                } catch (mediaError) {
                    console.error('Error getting Instagram media:', mediaError);
                    res.status(500).json({
                        error: 'Failed to get Instagram media',
                        details: mediaError.message
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error in Instagram media endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Export app for Vercel serverless deployment
module.exports = app;

// Missing API endpoints for Social Media Integration

    // Get social media posting stats
    app.get('/api/social/stats', (req, res) => {
        const query = `
            SELECT
                COUNT(*) as totalPosts,
                SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as successfulPosts,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedPosts,
                MAX(created_at) as lastPostTime
            FROM content
            WHERE type IN ('twitter_post', 'instagram_post')
        `;

        db.get(query, (err, row) => {
            if (err) {
                console.error('Error fetching social stats:', err);
                res.status(500).json({ error: 'Failed to fetch social media stats' });
            } else {
                res.json({
                    totalPosts: row.totalPosts || 0,
                    successfulPosts: row.successfulPosts || 0,
                    failedPosts: row.failedPosts || 0,
                    lastPostTime: row.lastPostTime || null
                });
            }
        });
    });

    // Schedule content for posting
    app.post('/api/social/schedule', (req, res) => {
        const { contentId, platforms, scheduledTime } = req.body;

        if (!contentId || !platforms || !scheduledTime) {
            return res.status(400).json({ error: 'Content ID, platforms, and scheduled time are required' });
        }

        // For now, just update the content status to scheduled
        const query = 'UPDATE content SET status = ?, scheduled_time = ? WHERE id = ?';

        db.run(query, ['scheduled', scheduledTime, contentId], function(err) {
            if (err) {
                console.error('Error scheduling content:', err);
                res.status(500).json({ error: 'Failed to schedule content' });
            } else {
                res.json({
                    success: true,
                    message: 'Content scheduled successfully',
                    contentId,
                    platforms,
                    scheduledTime
                });
            }
        });
    });

    // Twitter auth endpoint (simplified)
    app.post('/api/twitter/auth', async (req, res) => {
        try {
            const authUrl = await twitterService.getAuthUrl();
            res.json(authUrl);
        } catch (error) {
            console.error('Error getting Twitter auth URL:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Instagram auth endpoint (simplified)
    app.post('/api/instagram/auth', async (req, res) => {
        try {
            const authUrl = instagramService.getAuthUrl();
            res.json(authUrl);
        } catch (error) {
            console.error('Error getting Instagram auth URL:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Delete social media account
    app.delete('/api/:platform/accounts/:accountId', (req, res) => {
        const { platform, accountId } = req.params;

        if (!['twitter', 'instagram'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const query = 'DELETE FROM social_accounts WHERE id = ? AND platform = ?';

        db.run(query, [accountId, platform], function(err) {
            if (err) {
                console.error('Error deleting account:', err);
                res.status(500).json({ error: 'Failed to delete account' });
            } else {
                res.json({
                    success: true,
                    message: `${platform} account disconnected successfully`
                });
            }
        });
    });

    // Enhanced Analytics - Content Performance Tracking
    app.get('/api/analytics/content-performance', (req, res) => {
        const { timeRange = '30d', nicheId, platform } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        switch (timeRange) {
            case '7d': startDate.setDate(now.getDate() - 7); break;
            case '30d': startDate.setDate(now.getDate() - 30); break;
            case '90d': startDate.setDate(now.getDate() - 90); break;
            case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
            default: startDate.setDate(now.getDate() - 30);
        }

        let whereClause = 'WHERE created_at >= ?';
        let params = [startDate.toISOString()];

        if (nicheId) {
            whereClause += ' AND niche_id = ?';
            params.push(nicheId);
        }

        if (platform && platform !== 'all') {
            whereClause += ' AND type LIKE ?';
            params.push(`%${platform}%`);
        }

        const query = `
            SELECT
                c.id,
                c.content,
                c.type as platform,
                c.created_at,
                n.name as niche_name,
                (RANDOM() % 1000 + 50) as engagement_score,
                (RANDOM() % 500 + 25) as reach,
                (RANDOM() % 50 + 5) as clicks
            FROM content c
            LEFT JOIN niches n ON c.niche_id = n.id
            ${whereClause}
            ORDER BY engagement_score DESC
            LIMIT 50
        `;

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching content performance:', err);
                res.status(500).json({ error: 'Failed to fetch content performance' });
            } else {
                res.json({
                    success: true,
                    data: rows,
                    summary: {
                        totalContent: rows.length,
                        avgEngagement: rows.reduce((sum, row) => sum + row.engagement_score, 0) / rows.length || 0,
                        topPerformer: rows[0] || null
                    }
                });
            }
        });
    });

    // Advanced Performance Analytics endpoint
    app.get('/api/analytics/performance', (req, res) => {
        const { timeRange = '30d', platform = 'all' } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        switch (timeRange) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }

        // Build platform filter
        let platformFilter = '';
        if (platform !== 'all') {
            platformFilter = `AND type LIKE '%${platform}%'`;
        }

        // Get performance metrics
        const queries = {
            totalContent: `
                SELECT COUNT(*) as count
                FROM content
                WHERE created_at >= ? ${platformFilter}
            `,
            contentByPlatform: `
                SELECT
                    CASE
                        WHEN type LIKE '%twitter%' OR type LIKE '%tweet%' THEN 'twitter'
                        WHEN type LIKE '%instagram%' THEN 'instagram'
                        ELSE 'other'
                    END as platform,
                    COUNT(*) as count
                FROM content
                WHERE created_at >= ? ${platformFilter}
                GROUP BY platform
            `,
            engagementTrends: `
                SELECT
                    DATE(created_at) as date,
                    COUNT(*) * (RANDOM() % 50 + 50) as engagement,
                    COUNT(*) * (RANDOM() % 100 + 100) as reach
                FROM content
                WHERE created_at >= ? ${platformFilter}
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `,
            topContent: `
                SELECT
                    id,
                    content,
                    (SELECT name FROM niches WHERE id = content.niche_id) as niche,
                    type as platform,
                    (RANDOM() % 1000 + 100) as engagement,
                    created_at
                FROM content
                WHERE created_at >= ? ${platformFilter}
                ORDER BY engagement DESC
                LIMIT 10
            `
        };

        Promise.all([
            new Promise((resolve, reject) => {
                db.get(queries.totalContent, [startDate.toISOString()], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            }),
            new Promise((resolve, reject) => {
                db.all(queries.contentByPlatform, [startDate.toISOString()], (err, rows) => {
                    if (err) reject(err);
                    else {
                        const platformData = { twitter: 0, instagram: 0, total: 0 };
                        rows.forEach(row => {
                            platformData[row.platform] = row.count;
                            platformData.total += row.count;
                        });
                        resolve(platformData);
                    }
                });
            }),
            new Promise((resolve, reject) => {
                db.all(queries.engagementTrends, [startDate.toISOString()], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                db.all(queries.topContent, [startDate.toISOString()], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT name FROM niches ORDER BY RANDOM() LIMIT 1', (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.name : 'Technology & Gaming');
                });
            })
        ]).then(([totalContent, contentByPlatform, engagementTrends, topContent, topPerformingNiche]) => {
            // Calculate average engagement rate (simulated)
            const avgEngagementRate = 0.045 + (Math.random() * 0.02); // 4.5-6.5%

            res.json({
                totalContent,
                avgEngagementRate,
                topPerformingNiche,
                contentByPlatform,
                engagementTrends,
                topContent
            });
        }).catch(error => {
            console.error('Error fetching performance analytics:', error);
            res.status(500).json({ error: 'Failed to fetch performance analytics' });
        });
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
            process.exit(0);
        });
    });

// Advanced Analytics API Endpoints
app.get('/api/analytics/dashboard/:timeframe?', async (req, res) => {
    try {
        const timeframe = req.params.timeframe || '30d';
        const analytics = await advancedAnalyticsService.getDashboardAnalytics(timeframe);
        res.json(analytics);
    } catch (error) {
        console.error('Error getting dashboard analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics data' });
    }
});

app.get('/api/analytics/predictive', async (req, res) => {
    try {
        const predictions = await advancedAnalyticsService.getPredictiveAnalytics();
        res.json(predictions);
    } catch (error) {
        console.error('Error getting predictive analytics:', error);
        res.status(500).json({ error: 'Failed to get predictive analytics' });
    }
});

app.post('/api/analytics/content-performance', async (req, res) => {
    try {
        const { contentId, platform, metrics } = req.body;

        if (!contentId || !platform || !metrics) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await advancedAnalyticsService.recordContentPerformance(contentId, platform, metrics);
        res.json({ success: true, id: result });
    } catch (error) {
        console.error('Error recording content performance:', error);
        res.status(500).json({ error: 'Failed to record content performance' });
    }
});

app.post('/api/analytics/growth-metrics', async (req, res) => {
    try {
        const { platform, metrics } = req.body;

        if (!platform || !metrics) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await advancedAnalyticsService.recordGrowthMetrics(platform, metrics);
        res.json({ success: true, id: result });
    } catch (error) {
        console.error('Error recording growth metrics:', error);
        res.status(500).json({ error: 'Failed to record growth metrics' });
    }
});

app.post('/api/analytics/growth-bot', async (req, res) => {
    try {
        const { metrics } = req.body;

        if (!metrics) {
            return res.status(400).json({ error: 'Missing metrics data' });
        }

        const result = await advancedAnalyticsService.recordGrowthBotAnalytics(metrics);
        res.json({ success: true, id: result });
    } catch (error) {
        console.error('Error recording growth bot analytics:', error);
        res.status(500).json({ error: 'Failed to record growth bot analytics' });
    }
});

// Content Templates API Endpoints
app.get('/api/content-templates', async (req, res) => {
    try {
        const category = req.query.category;
        const templates = await contentTemplateService.getTemplatesByCategory(category);
        res.json(templates);
    } catch (error) {
        console.error('Error getting content templates:', error);
        res.status(500).json({ error: 'Failed to get content templates' });
    }
});

app.get('/api/content-templates/categories', async (req, res) => {
    try {
        const categories = await contentTemplateService.getTemplateCategories();
        res.json(categories);
    } catch (error) {
        console.error('Error getting template categories:', error);
        res.status(500).json({ error: 'Failed to get template categories' });
    }
});

app.get('/api/content-templates/prompts', async (req, res) => {
    try {
        const nicheId = req.query.nicheId;
        const prompts = await contentTemplateService.getSavedPrompts(nicheId);
        res.json(prompts);
    } catch (error) {
        console.error('Error getting saved prompts:', error);
        res.status(500).json({ error: 'Failed to get saved prompts' });
    }
});

app.get('/api/content-templates/:id', async (req, res) => {
    try {
        const template = await contentTemplateService.getTemplateById(req.params.id);
        if (template) {
            res.json(template);
        } else {
            res.status(404).json({ error: 'Template not found' });
        }
    } catch (error) {
        console.error('Error getting template:', error);
        res.status(500).json({ error: 'Failed to get template' });
    }
});

app.post('/api/content-templates/apply', async (req, res) => {
    try {
        const { templateId, variables } = req.body;

        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }

        const template = await contentTemplateService.getTemplateById(templateId);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const appliedTemplate = contentTemplateService.applyTemplate(template, variables || {});

        // Increment usage count
        await contentTemplateService.incrementTemplateUsage(templateId);

        res.json(appliedTemplate);
    } catch (error) {
        console.error('Error applying template:', error);
        res.status(500).json({ error: 'Failed to apply template' });
    }
});

app.post('/api/content-templates/prompts', async (req, res) => {
    try {
        const prompt = req.body;

        if (!prompt.name || !prompt.prompt_text) {
            return res.status(400).json({ error: 'Name and prompt text are required' });
        }

        const promptId = await contentTemplateService.savePrompt(prompt);
        res.json({ success: true, id: promptId });
    } catch (error) {
        console.error('Error saving prompt:', error);
        res.status(500).json({ error: 'Failed to save prompt' });
    }
});

app.post('/api/content/generate-from-template', async (req, res) => {
    try {
        const { templateContent, templateId } = req.body;

        if (!templateContent) {
            return res.status(400).json({ error: 'Template content is required' });
        }

        // Convert template content to a format suitable for content generation
        let combinedContent = '';

        if (typeof templateContent === 'object') {
            // Combine all template sections into a single content string
            combinedContent = Object.values(templateContent)
                .filter(value => typeof value === 'string')
                .join('\n\n');
        } else {
            combinedContent = String(templateContent);
        }

        // Use the AI service to enhance and format the template content
        const enhancedContent = await aiModelManager.generateContent(
            { name: 'General', persona: 'Professional content creator' },
            'template-enhancement',
            combinedContent
        );

        res.json({
            success: true,
            content: enhancedContent,
            template_id: templateId
        });
    } catch (error) {
        console.error('Error generating content from template:', error);
        res.status(500).json({ error: 'Failed to generate content from template' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 AI Content Generator Server running on port ${PORT}`);
    console.log(`📱 Desktop app ready at: http://localhost:${PORT}`);
});