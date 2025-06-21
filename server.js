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

const app = express();
const port = process.env.PORT || 3000;

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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (niche_id) REFERENCES niches (id)
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
                // Main Categories
                {
                    name: "Technology & Innovation",
                    description: "Latest tech trends, gadgets, AI, and digital innovation",
                    persona: "Tech enthusiast who loves exploring cutting-edge technology and sharing insights about digital transformation",
                    keywords: "technology, innovation, AI, gadgets, digital, tech trends, software, hardware"
                },
                {
                    name: "Fitness & Health",
                    description: "Workout routines, nutrition tips, wellness, and healthy lifestyle",
                    persona: "Fitness coach passionate about helping people achieve their health goals through sustainable lifestyle changes",
                    keywords: "fitness, health, workout, nutrition, wellness, exercise, diet, healthy lifestyle"
                },
                {
                    name: "Business & Entrepreneurship",
                    description: "Startup advice, business strategies, entrepreneurship, and professional growth",
                    persona: "Experienced entrepreneur who mentors others and shares practical business insights and strategies",
                    keywords: "business, entrepreneurship, startup, strategy, leadership, growth, success, professional"
                },
                {
                    name: "Travel & Adventure",
                    description: "Travel destinations, adventure stories, cultural experiences, and travel tips",
                    persona: "World traveler who captures unique experiences and inspires others to explore new destinations",
                    keywords: "travel, adventure, destinations, culture, exploration, wanderlust, journey, experiences"
                },
                {
                    name: "Food & Cooking",
                    description: "Recipes, cooking techniques, food culture, and culinary experiences",
                    persona: "Passionate chef who loves experimenting with flavors and sharing delicious recipes with food lovers",
                    keywords: "food, cooking, recipes, culinary, chef, cuisine, flavors, delicious, kitchen"
                },
                {
                    name: "Personal Development",
                    description: "Self-improvement, productivity, mindset, and personal growth strategies",
                    persona: "Life coach dedicated to helping people unlock their potential and achieve personal transformation",
                    keywords: "personal development, self improvement, productivity, mindset, growth, motivation, success habits"
                },
                {
                    name: "Finance & Investing",
                    description: "Financial literacy, investment strategies, wealth building, and money management",
                    persona: "Financial advisor passionate about helping people achieve financial freedom through smart money decisions",
                    keywords: "finance, investing, money, wealth, financial freedom, budgeting, stocks, crypto"
                },
                {
                    name: "Fashion & Style",
                    description: "Fashion trends, style tips, outfit inspiration, and personal styling advice",
                    persona: "Fashion stylist who helps people express their personality through clothing and develop confidence in their style",
                    keywords: "fashion, style, outfit, trends, clothing, accessories, beauty, personal style"
                },
                {
                    name: "Home & Lifestyle",
                    description: "Home decor, organization, DIY projects, and lifestyle inspiration",
                    persona: "Interior design enthusiast who creates beautiful, functional spaces and shares practical home improvement tips",
                    keywords: "home decor, interior design, DIY, organization, lifestyle, home improvement, decorating"
                },
                {
                    name: "Parenting & Family",
                    description: "Parenting tips, family activities, child development, and family lifestyle content",
                    persona: "Experienced parent who shares practical parenting advice and creates meaningful family experiences",
                    keywords: "parenting, family, kids, children, motherhood, fatherhood, family life, child development"
                },
                // Entertainment & Media
                {
                    name: "Gaming & Esports",
                    description: "Video games, gaming culture, esports, game reviews, and gaming lifestyle",
                    persona: "Gaming enthusiast who shares game insights, reviews, and connects with the gaming community",
                    keywords: "gaming, esports, video games, streaming, game reviews, gaming culture, PC gaming, console"
                },
                {
                    name: "Movies & Entertainment",
                    description: "Movie reviews, entertainment news, celebrity content, and pop culture discussions",
                    persona: "Entertainment critic who provides insightful reviews and commentary on movies, shows, and pop culture",
                    keywords: "movies, entertainment, film, TV shows, celebrities, pop culture, reviews, cinema"
                },
                {
                    name: "Music & Audio",
                    description: "Music discovery, artist spotlights, music production, and audio content",
                    persona: "Music lover who discovers and shares amazing artists while exploring all genres and music culture",
                    keywords: "music, artists, songs, albums, music production, audio, concerts, music discovery"
                },
                {
                    name: "Books & Literature",
                    description: "Book reviews, reading recommendations, author interviews, and literary discussions",
                    persona: "Avid reader who shares book recommendations and creates a community of literature enthusiasts",
                    keywords: "books, reading, literature, authors, book reviews, writing, novels, book recommendations"
                },
                // Creative & Artistic
                {
                    name: "Art & Design",
                    description: "Visual arts, graphic design, creative inspiration, and artistic techniques",
                    persona: "Creative artist who shares artistic inspiration, techniques, and celebrates visual creativity",
                    keywords: "art, design, creativity, visual arts, graphic design, illustration, artistic inspiration"
                },
                {
                    name: "Photography",
                    description: "Photography tips, camera techniques, photo editing, and visual storytelling",
                    persona: "Professional photographer who shares technical expertise and helps others capture beautiful moments",
                    keywords: "photography, camera, photo editing, visual storytelling, portraits, landscape photography"
                },
                {
                    name: "Writing & Content Creation",
                    description: "Writing tips, content strategy, storytelling, and creative writing inspiration",
                    persona: "Content creator and writer who helps others improve their writing and storytelling skills",
                    keywords: "writing, content creation, storytelling, blogging, copywriting, creative writing"
                },
                // Lifestyle & Wellness
                {
                    name: "Mental Health & Wellness",
                    description: "Mental health awareness, wellness practices, mindfulness, and emotional well-being",
                    persona: "Mental health advocate who promotes wellness and helps reduce stigma around mental health topics",
                    keywords: "mental health, wellness, mindfulness, self care, therapy, emotional health, stress management"
                },
                {
                    name: "Spirituality & Mindfulness",
                    description: "Spiritual growth, meditation, mindfulness practices, and inner peace content",
                    persona: "Spiritual guide who helps others find inner peace and develop meaningful spiritual practices",
                    keywords: "spirituality, meditation, mindfulness, inner peace, spiritual growth, consciousness"
                },
                {
                    name: "Relationships & Dating",
                    description: "Relationship advice, dating tips, love stories, and interpersonal communication",
                    persona: "Relationship coach who helps people build healthy, meaningful connections and navigate dating",
                    keywords: "relationships, dating, love, communication, relationship advice, romance, couples"
                },
                // Specialized Interests
                {
                    name: "Pets & Animals",
                    description: "Pet care, animal welfare, cute pet content, and animal education",
                    persona: "Animal lover who shares pet care tips and advocates for animal welfare while celebrating pet joy",
                    keywords: "pets, animals, dogs, cats, pet care, animal welfare, cute animals, pet training"
                },
                {
                    name: "Science & Education",
                    description: "Scientific discoveries, educational content, research insights, and learning resources",
                    persona: "Science educator who makes complex topics accessible and inspires curiosity about the natural world",
                    keywords: "science, education, research, learning, discovery, STEM, knowledge, scientific facts"
                },
                {
                    name: "Sports & Athletics",
                    description: "Sports news, athletic performance, team updates, and sports culture content",
                    persona: "Sports enthusiast who provides insights on games, athletes, and the culture surrounding sports",
                    keywords: "sports, athletics, fitness, teams, games, athletes, sports news, competition"
                },
                {
                    name: "Automotive & Transportation",
                    description: "Car reviews, automotive news, vehicle maintenance, and transportation innovation",
                    persona: "Automotive expert who shares car insights, reviews, and keeps up with transportation technology",
                    keywords: "cars, automotive, vehicles, transportation, car reviews, auto news, driving"
                },
                // Niche Communities
                {
                    name: "Anime & Manga",
                    description: "Anime reviews, manga recommendations, Japanese culture, and otaku community content",
                    persona: "Anime enthusiast who shares reviews, recommendations, and celebrates Japanese pop culture",
                    keywords: "anime, manga, Japanese culture, otaku, anime reviews, manga recommendations, cosplay"
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
            // If we have fewer than 24 niches, add the missing ones
            if (row.count < 24) {
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

app.get('/api/growth-bot/stats', (req, res) => {
    try {
        const stats = growthBotService.getStats();
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

// Start server only in development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log('API endpoints available:');
        console.log('  GET  /api/stats - Dashboard statistics');
        console.log('  GET  /api/niches - List all niches');
        console.log('  POST /api/niches - Create new niche');
        console.log('  GET  /api/events - Server-Sent Events for real-time updates');
        console.log('  POST /api/generate-content - Generate AI content for niche');
        console.log('  GET  /api/content - Get generated content');
        console.log('  PATCH /api/content/:id - Update content status');
        console.log('  GET  /api/test-gemini - Test Gemini API connection');
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
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 AI Content Generator Server running on port ${PORT}`);
    console.log(`📱 Desktop app ready at: http://localhost:${PORT}`);
});