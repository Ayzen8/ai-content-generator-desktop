const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const port = 3000;

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