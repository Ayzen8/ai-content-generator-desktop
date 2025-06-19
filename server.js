const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const GeminiService = require('./services/gemini-service');

const app = express();
const port = 3000;

// Initialize Gemini service
const geminiService = new GeminiService();

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
    `;

    db.exec(createTables, (err) => {
        if (err) {
            console.error('Error creating tables:', err.message);
        } else {
            console.log('Database tables initialized');
        }
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

// API Routes

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

        // Generate content using Gemini
        const content = await geminiService.generateContent(niche);

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

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
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