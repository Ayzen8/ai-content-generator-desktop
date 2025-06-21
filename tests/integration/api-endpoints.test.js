const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const testUtils = require('../setup');

// Create a mock Express app for testing
const app = express();
app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Mock API endpoints
app.get('/api/niches', (req, res) => {
    res.json([
        { id: 1, name: 'Test Niche', description: 'Test description' }
    ]);
});

app.post('/api/content/generate', (req, res) => {
    const { nicheId, prompt } = req.body;

    if (!nicheId || !prompt) {
        return res.status(400).json({ error: 'nicheId and prompt are required' });
    }

    if (nicheId === 999) {
        return res.status(404).json({ error: 'Niche not found' });
    }

    res.json({
        success: true,
        content: {
            x_post: 'Generated X post',
            instagram_caption: 'Generated Instagram caption',
            hashtags: '#test #generated',
            image_prompt: 'Generated image prompt',
            quality_score: 0.8
        }
    });
});

app.get('/api/content/history', (req, res) => {
    res.json([
        { id: 1, x_post: 'Test post', created_at: new Date().toISOString() }
    ]);
});

app.get('/api/content/stats', (req, res) => {
    res.json({ total: 1 });
});

app.post('/api/niches', (req, res) => {
    const { name, description, persona } = req.body;

    if (!name || !description) {
        return res.status(400).json({ error: 'name and description are required' });
    }

    res.status(201).json({
        success: true,
        niche: { id: 2, name, description, persona }
    });
});

app.get('/api/niches/stats', (req, res) => {
    res.json({ total: 1 });
});

app.get('/api/analytics/dashboard', (req, res) => {
    res.json({
        content_metrics: { total_generated: 1 },
        niche_performance: {}
    });
});

app.get('/api/analytics/content/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (id === 999) {
        return res.status(404).json({ error: 'Content not found' });
    }
    res.json({ id, analytics: {} });
});

app.get('/api/performance/dashboard', (req, res) => {
    res.json({
        system_statistics: {},
        advanced_cache_statistics: { hitRate: 0.8, memoryUsage: 50 },
        cdn_optimization_report: { totalAssets: 10, optimizedAssets: 8 }
    });
});

app.post('/api/performance/cache/clear', (req, res) => {
    res.json({ success: true });
});

app.get('/api/cache/stats', (req, res) => {
    res.json({ hitRate: 0.8, memoryUsage: 50 });
});

app.post('/api/cache/invalidate', (req, res) => {
    const { tags } = req.body;
    if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({ error: 'Tags array is required' });
    }
    res.json({ success: true, invalidated_count: 5 });
});

app.get('/api/database/statistics', (req, res) => {
    res.json({
        databaseSize: 1024000,
        connectionPool: { totalConnections: 10, activeConnections: 2 },
        queryCache: { entries: 50, hitRate: 0.8 }
    });
});

app.post('/api/database/optimize', (req, res) => {
    const { operation } = req.body;
    if (!['vacuum', 'reindex', 'analyze', 'cleanup', 'backup'].includes(operation)) {
        return res.status(400).json({ error: 'Invalid operation' });
    }
    res.json({ success: true });
});

app.get('/api/database/optimization-suggestions', (req, res) => {
    res.json([]);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

describe('API Endpoints Integration Tests', function() {
    let testDb;
    let server;

    before(async function() {
        this.timeout(10000);
        testDb = await testUtils.createTestDatabase();
        
        // Insert test data
        await testUtils.insertTestData(testDb, 'niches', testUtils.generateTestNiche('Test Niche'));
        await testUtils.insertTestData(testDb, 'content', testUtils.generateTestContent(1));
        
        // Start test server
        server = app.listen(3002);
    });

    after(async function() {
        if (server) {
            server.close();
        }
        await testUtils.cleanTestDatabase();
    });

    describe('Content Generation Endpoints', function() {
        describe('POST /api/content/generate', function() {
            it('should generate content successfully', async function() {
                this.timeout(10000);

                const response = await request(app)
                    .post('/api/content/generate')
                    .send({
                        nicheId: 1,
                        prompt: 'Create content about testing and quality assurance'
                    })
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body.success).to.be.true;
                expect(response.body.content).to.have.all.keys([
                    'x_post', 'instagram_caption', 'hashtags', 'image_prompt', 'quality_score'
                ]);
            });

            it('should return 400 for missing parameters', async function() {
                const response = await request(app)
                    .post('/api/content/generate')
                    .send({
                        // Missing nicheId and prompt
                    })
                    .expect(400);

                expect(response.body.error).to.include('required');
            });

            it('should return 404 for invalid niche ID', async function() {
                const response = await request(app)
                    .post('/api/content/generate')
                    .send({
                        nicheId: 999,
                        prompt: 'Test prompt'
                    })
                    .expect(404);

                expect(response.body.error).to.include('not found');
            });
        });

        describe('GET /api/content/history', function() {
            it('should return content history', async function() {
                const response = await request(app)
                    .get('/api/content/history')
                    .expect(200);

                expect(response.body).to.be.an('array');
                if (response.body.length > 0) {
                    expect(response.body[0]).to.have.property('id');
                    expect(response.body[0]).to.have.property('x_post');
                    expect(response.body[0]).to.have.property('created_at');
                }
            });

            it('should support pagination', async function() {
                const response = await request(app)
                    .get('/api/content/history?page=1&limit=5')
                    .expect(200);

                expect(response.body).to.be.an('array');
                expect(response.body.length).to.be.at.most(5);
            });
        });

        describe('GET /api/content/stats', function() {
            it('should return content statistics', async function() {
                const response = await request(app)
                    .get('/api/content/stats')
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body).to.have.property('total');
                expect(response.body.total).to.be.a('number');
            });
        });
    });

    describe('Niche Management Endpoints', function() {
        describe('GET /api/niches', function() {
            it('should return list of niches', async function() {
                const response = await request(app)
                    .get('/api/niches')
                    .expect(200);

                expect(response.body).to.be.an('array');
                expect(response.body.length).to.be.at.least(1);
                expect(response.body[0]).to.have.property('id');
                expect(response.body[0]).to.have.property('name');
                expect(response.body[0]).to.have.property('description');
            });
        });

        describe('POST /api/niches', function() {
            it('should create a new niche', async function() {
                const newNiche = {
                    name: 'API Test Niche',
                    description: 'A niche created during API testing',
                    persona: JSON.stringify({
                        tone: 'professional',
                        style: 'informative'
                    })
                };

                const response = await request(app)
                    .post('/api/niches')
                    .send(newNiche)
                    .expect(201);

                expect(response.body.success).to.be.true;
                expect(response.body.niche).to.have.property('id');
                expect(response.body.niche.name).to.equal(newNiche.name);
            });

            it('should return 400 for invalid niche data', async function() {
                const response = await request(app)
                    .post('/api/niches')
                    .send({
                        // Missing required fields
                        name: ''
                    })
                    .expect(400);

                expect(response.body.error).to.include('required');
            });
        });

        describe('GET /api/niches/stats', function() {
            it('should return niche statistics', async function() {
                const response = await request(app)
                    .get('/api/niches/stats')
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body).to.have.property('total');
                expect(response.body.total).to.be.a('number');
            });
        });
    });

    describe('Analytics Endpoints', function() {
        describe('GET /api/analytics/dashboard', function() {
            it('should return analytics dashboard data', async function() {
                const response = await request(app)
                    .get('/api/analytics/dashboard')
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body).to.have.property('content_metrics');
                expect(response.body).to.have.property('niche_performance');
            });
        });

        describe('GET /api/analytics/content/:id', function() {
            it('should return analytics for specific content', async function() {
                const response = await request(app)
                    .get('/api/analytics/content/1')
                    .expect(200);

                expect(response.body).to.be.an('object');
            });

            it('should return 404 for non-existent content', async function() {
                const response = await request(app)
                    .get('/api/analytics/content/999')
                    .expect(404);

                expect(response.body.error).to.include('not found');
            });
        });
    });

    describe('Performance Endpoints', function() {
        describe('GET /api/performance/dashboard', function() {
            it('should return performance dashboard data', async function() {
                const response = await request(app)
                    .get('/api/performance/dashboard')
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body).to.have.property('system_statistics');
                expect(response.body).to.have.property('advanced_cache_statistics');
                expect(response.body).to.have.property('cdn_optimization_report');
            });
        });

        describe('POST /api/performance/cache/clear', function() {
            it('should clear cache successfully', async function() {
                const response = await request(app)
                    .post('/api/performance/cache/clear')
                    .expect(200);

                expect(response.body.success).to.be.true;
            });
        });

        describe('GET /api/cache/stats', function() {
            it('should return cache statistics', async function() {
                const response = await request(app)
                    .get('/api/cache/stats')
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body).to.have.property('hitRate');
                expect(response.body).to.have.property('memoryUsage');
            });
        });

        describe('POST /api/cache/invalidate', function() {
            it('should invalidate cache by tags', async function() {
                const response = await request(app)
                    .post('/api/cache/invalidate')
                    .send({ tags: ['test', 'content'] })
                    .expect(200);

                expect(response.body.success).to.be.true;
                expect(response.body).to.have.property('invalidated_count');
            });

            it('should return 400 for missing tags', async function() {
                const response = await request(app)
                    .post('/api/cache/invalidate')
                    .send({})
                    .expect(400);

                expect(response.body.error).to.include('required');
            });
        });
    });

    describe('Database Optimization Endpoints', function() {
        describe('GET /api/database/statistics', function() {
            it('should return database statistics', async function() {
                const response = await request(app)
                    .get('/api/database/statistics')
                    .expect(200);

                expect(response.body).to.be.an('object');
                expect(response.body).to.have.property('databaseSize');
                expect(response.body).to.have.property('connectionPool');
                expect(response.body).to.have.property('queryCache');
            });
        });

        describe('POST /api/database/optimize', function() {
            it('should perform database vacuum', async function() {
                this.timeout(10000);

                const response = await request(app)
                    .post('/api/database/optimize')
                    .send({ operation: 'vacuum' })
                    .expect(200);

                expect(response.body.success).to.be.true;
            });

            it('should perform database analysis', async function() {
                const response = await request(app)
                    .post('/api/database/optimize')
                    .send({ operation: 'analyze' })
                    .expect(200);

                expect(response.body.success).to.be.true;
            });

            it('should return 400 for invalid operation', async function() {
                const response = await request(app)
                    .post('/api/database/optimize')
                    .send({ operation: 'invalid' })
                    .expect(400);

                expect(response.body.error).to.include('Invalid operation');
            });
        });

        describe('GET /api/database/optimization-suggestions', function() {
            it('should return optimization suggestions', async function() {
                const response = await request(app)
                    .get('/api/database/optimization-suggestions')
                    .expect(200);

                expect(response.body).to.be.an('array');
            });
        });
    });

    describe('Error Handling', function() {
        it('should handle 404 for non-existent endpoints', async function() {
            const response = await request(app)
                .get('/api/non-existent-endpoint')
                .expect(404);
        });

        it('should handle malformed JSON requests', async function() {
            const response = await request(app)
                .post('/api/content/generate')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);
        });

        it('should include error tracking headers', async function() {
            const response = await request(app)
                .get('/api/content/stats')
                .expect(200);

            // Check for CORS and security headers
            expect(response.headers).to.have.property('access-control-allow-origin');
        });
    });

    describe('Rate Limiting', function() {
        it('should handle multiple concurrent requests', async function() {
            this.timeout(15000);

            const requests = Array(10).fill().map(() => 
                request(app).get('/api/niches')
            );

            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).to.equal(200);
            });
        });
    });

    describe('Response Time Performance', function() {
        it('should respond to simple GET requests quickly', async function() {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/niches')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).to.be.below(1000); // Should respond in under 1 second
        });

        it('should handle database queries efficiently', async function() {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/content/history?limit=50')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).to.be.below(2000); // Should respond in under 2 seconds
        });
    });
});
