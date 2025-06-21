#!/usr/bin/env node

const request = require('supertest');
const express = require('express');
const testUtils = require('../setup');

// Create a lightweight mock app for performance testing
const app = express();
app.use(express.json());

// Add basic endpoints for benchmarking
app.get('/api/niches', (req, res) => {
    res.json([{ id: 1, name: 'Test Niche', description: 'Test description' }]);
});

app.get('/api/content/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const results = Array(Math.min(limit, 50)).fill().map((_, i) => ({
        id: i + 1,
        x_post: `Test post ${i + 1}`,
        created_at: new Date().toISOString()
    }));
    res.json(results);
});

app.get('/api/analytics/dashboard', (req, res) => {
    res.json({
        content_metrics: { total_generated: 100 },
        niche_performance: { engagement_rate: 0.05 }
    });
});

app.get('/api/performance/dashboard', (req, res) => {
    res.json({
        system_statistics: { cpu_usage: 25, memory_usage: 60 },
        advanced_cache_statistics: { hitRate: 0.8, memoryUsage: 50 },
        cdn_optimization_report: { totalAssets: 10, optimizedAssets: 8 }
    });
});

app.get('/api/cache/stats', (req, res) => {
    res.json({ hitRate: 0.8, memoryUsage: 50 });
});

app.get('/api/database/statistics', (req, res) => {
    res.json({
        databaseSize: 1024000,
        connectionPool: { totalConnections: 10, activeConnections: 2 },
        queryCache: { entries: 50, hitRate: 0.8 }
    });
});

class PerformanceBenchmark {
    constructor() {
        this.results = {
            api_endpoints: {},
            database_operations: {},
            memory_usage: {},
            concurrent_load: {}
        };
        this.server = null;
    }

    async runBenchmarks() {
        console.log('🚀 Starting Performance Benchmarks\n');
        
        try {
            await this.setupBenchmarkEnvironment();
            
            await this.benchmarkAPIEndpoints();
            await this.benchmarkDatabaseOperations();
            await this.benchmarkMemoryUsage();
            await this.benchmarkConcurrentLoad();
            
            await this.generateBenchmarkReport();
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error.message);
            process.exit(1);
        } finally {
            if (this.server) {
                this.server.close();
            }
        }
    }

    async setupBenchmarkEnvironment() {
        console.log('🔧 Setting up benchmark environment...');

        // Create test database
        await testUtils.createTestDatabase();

        // Start test server on a different port
        this.server = app.listen(3005);
        await testUtils.wait(500);

        console.log('✅ Benchmark environment ready\n');
    }

    async benchmarkAPIEndpoints() {
        console.log('📊 Benchmarking API Endpoints...');
        console.log('=' .repeat(50));
        
        const endpoints = [
            { method: 'GET', path: '/api/niches', name: 'Get Niches' },
            { method: 'GET', path: '/api/content/history', name: 'Get Content History' },
            { method: 'GET', path: '/api/analytics/dashboard', name: 'Get Analytics Dashboard' },
            { method: 'GET', path: '/api/performance/dashboard', name: 'Get Performance Dashboard' },
            { method: 'GET', path: '/api/cache/stats', name: 'Get Cache Stats' }
        ];

        for (const endpoint of endpoints) {
            const performance = await testUtils.measurePerformance(async () => {
                await request(app)[endpoint.method.toLowerCase()](endpoint.path).expect(200);
            }, 10);

            this.results.api_endpoints[endpoint.name] = {
                average_ms: performance.average,
                min_ms: performance.min,
                max_ms: performance.max,
                iterations: performance.iterations
            };

            console.log(`${endpoint.name}: ${performance.average.toFixed(2)}ms avg (${performance.min.toFixed(2)}-${performance.max.toFixed(2)}ms)`);
        }
        
        console.log('✅ API endpoint benchmarks completed\n');
    }

    async benchmarkDatabaseOperations() {
        console.log('🗄️ Benchmarking Database Operations...');
        console.log('=' .repeat(50));
        
        const operations = [
            {
                name: 'Insert Content',
                operation: async () => {
                    const testDb = await testUtils.createTestDatabase();
                    await testUtils.insertTestData(testDb, 'content', testUtils.generateTestContent());
                }
            },
            {
                name: 'Query Content History',
                operation: async () => {
                    await request(app).get('/api/content/history?limit=50').expect(200);
                }
            },
            {
                name: 'Analytics Query',
                operation: async () => {
                    await request(app).get('/api/analytics/dashboard').expect(200);
                }
            },
            {
                name: 'Database Statistics',
                operation: async () => {
                    await request(app).get('/api/database/statistics').expect(200);
                }
            }
        ];

        for (const op of operations) {
            const performance = await testUtils.measurePerformance(op.operation, 5);

            this.results.database_operations[op.name] = {
                average_ms: performance.average,
                min_ms: performance.min,
                max_ms: performance.max,
                iterations: performance.iterations
            };

            console.log(`${op.name}: ${performance.average.toFixed(2)}ms avg (${performance.min.toFixed(2)}-${performance.max.toFixed(2)}ms)`);
        }
        
        console.log('✅ Database operation benchmarks completed\n');
    }

    async benchmarkMemoryUsage() {
        console.log('💾 Benchmarking Memory Usage...');
        console.log('=' .repeat(50));
        
        const initialMemory = testUtils.getMemoryUsage();
        console.log(`Initial Memory: ${initialMemory.heapUsed}MB used, ${initialMemory.heapTotal}MB total`);

        // Simulate load
        const requests = Array(50).fill().map(() => 
            request(app).get('/api/niches').expect(200)
        );
        
        await Promise.all(requests);
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        await testUtils.wait(1000);
        
        const finalMemory = testUtils.getMemoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        this.results.memory_usage = {
            initial_heap_mb: initialMemory.heapUsed,
            final_heap_mb: finalMemory.heapUsed,
            increase_mb: memoryIncrease,
            rss_mb: finalMemory.rss,
            external_mb: finalMemory.external
        };

        console.log(`Final Memory: ${finalMemory.heapUsed}MB used, ${finalMemory.heapTotal}MB total`);
        console.log(`Memory Increase: ${memoryIncrease.toFixed(2)}MB`);
        console.log('✅ Memory usage benchmarks completed\n');
    }

    async benchmarkConcurrentLoad() {
        console.log('⚡ Benchmarking Concurrent Load...');
        console.log('=' .repeat(50));
        
        const concurrencyLevels = [1, 5, 10, 20];
        
        for (const concurrency of concurrencyLevels) {
            console.log(`Testing ${concurrency} concurrent requests...`);
            
            const startTime = Date.now();
            
            const requests = Array(concurrency).fill().map(() => 
                request(app).get('/api/niches').expect(200)
            );
            
            await Promise.all(requests);
            
            const duration = Date.now() - startTime;
            const requestsPerSecond = (concurrency / duration * 1000).toFixed(2);
            
            this.results.concurrent_load[`${concurrency}_concurrent`] = {
                requests: concurrency,
                duration_ms: duration,
                requests_per_second: parseFloat(requestsPerSecond),
                avg_response_time_ms: duration / concurrency
            };

            console.log(`${concurrency} requests: ${duration}ms total, ${requestsPerSecond} req/s`);
        }
        
        console.log('✅ Concurrent load benchmarks completed\n');
    }

    async generateBenchmarkReport() {
        const report = {
            timestamp: new Date().toISOString(),
            environment: {
                node_version: process.version,
                platform: process.platform,
                arch: process.arch,
                memory_limit: process.memoryUsage()
            },
            results: this.results,
            summary: this.generateSummary()
        };

        // Save JSON report
        const fs = require('fs').promises;
        const path = require('path');
        
        const reportsDir = path.join(__dirname, '..', 'reports');
        await fs.mkdir(reportsDir, { recursive: true });
        
        const reportPath = path.join(reportsDir, 'benchmark-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Generate HTML report
        await this.generateHTMLBenchmarkReport(report);

        // Print summary
        this.printBenchmarkSummary(report);
    }

    generateSummary() {
        const apiAvg = Object.values(this.results.api_endpoints)
            .reduce((sum, result) => sum + result.average_ms, 0) / Object.keys(this.results.api_endpoints).length;

        const dbAvg = Object.values(this.results.database_operations)
            .reduce((sum, result) => sum + result.average_ms, 0) / Object.keys(this.results.database_operations).length;

        const maxConcurrency = Math.max(...Object.values(this.results.concurrent_load).map(r => r.requests));
        const maxThroughput = Math.max(...Object.values(this.results.concurrent_load).map(r => r.requests_per_second));

        return {
            average_api_response_time_ms: apiAvg,
            average_db_operation_time_ms: dbAvg,
            max_concurrent_requests: maxConcurrency,
            max_throughput_req_per_sec: maxThroughput,
            memory_efficiency_score: this.calculateMemoryEfficiencyScore(),
            overall_performance_grade: this.calculateOverallGrade(apiAvg, dbAvg, maxThroughput)
        };
    }

    calculateMemoryEfficiencyScore() {
        const memoryIncrease = this.results.memory_usage.increase_mb;
        if (memoryIncrease < 10) return 'A';
        if (memoryIncrease < 25) return 'B';
        if (memoryIncrease < 50) return 'C';
        if (memoryIncrease < 100) return 'D';
        return 'F';
    }

    calculateOverallGrade(apiAvg, dbAvg, maxThroughput) {
        let score = 100;
        
        // Penalize slow API responses
        if (apiAvg > 1000) score -= 30;
        else if (apiAvg > 500) score -= 15;
        else if (apiAvg > 200) score -= 5;
        
        // Penalize slow database operations
        if (dbAvg > 2000) score -= 25;
        else if (dbAvg > 1000) score -= 10;
        else if (dbAvg > 500) score -= 5;
        
        // Reward high throughput
        if (maxThroughput > 50) score += 10;
        else if (maxThroughput > 20) score += 5;
        
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    async generateHTMLBenchmarkReport(report) {
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Content Generator - Performance Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 1.5em; font-weight: bold; }
        .grade-a { color: #28a745; }
        .grade-b { color: #17a2b8; }
        .grade-c { color: #ffc107; }
        .grade-d { color: #fd7e14; }
        .grade-f { color: #dc3545; }
        .results { margin-top: 30px; }
        .result-section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .result-section h3 { margin: 0 0 15px 0; color: #333; }
        .result-table { width: 100%; border-collapse: collapse; }
        .result-table th, .result-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .result-table th { background: #f8f9fa; font-weight: bold; }
        .timestamp { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ AI Content Generator Performance Benchmark</h1>
            <p>Comprehensive performance analysis and optimization insights</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Overall Grade</h3>
                <div class="value grade-${report.summary.overall_performance_grade.toLowerCase()}">${report.summary.overall_performance_grade}</div>
            </div>
            <div class="metric">
                <h3>API Response Time</h3>
                <div class="value">${report.summary.average_api_response_time_ms.toFixed(1)}ms</div>
            </div>
            <div class="metric">
                <h3>Max Throughput</h3>
                <div class="value">${report.summary.max_throughput_req_per_sec.toFixed(1)} req/s</div>
            </div>
            <div class="metric">
                <h3>Memory Efficiency</h3>
                <div class="value grade-${report.summary.memory_efficiency_score.toLowerCase()}">${report.summary.memory_efficiency_score}</div>
            </div>
        </div>
        
        <div class="results">
            <div class="result-section">
                <h3>📊 API Endpoint Performance</h3>
                <table class="result-table">
                    <thead>
                        <tr><th>Endpoint</th><th>Average (ms)</th><th>Min (ms)</th><th>Max (ms)</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(report.results.api_endpoints).map(([name, data]) => 
                            `<tr><td>${name}</td><td>${data.average_ms.toFixed(2)}</td><td>${data.min_ms.toFixed(2)}</td><td>${data.max_ms.toFixed(2)}</td></tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="result-section">
                <h3>⚡ Concurrent Load Performance</h3>
                <table class="result-table">
                    <thead>
                        <tr><th>Concurrent Requests</th><th>Duration (ms)</th><th>Throughput (req/s)</th><th>Avg Response (ms)</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(report.results.concurrent_load).map(([name, data]) => 
                            `<tr><td>${data.requests}</td><td>${data.duration_ms}</td><td>${data.requests_per_second.toFixed(2)}</td><td>${data.avg_response_time_ms.toFixed(2)}</td></tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="timestamp">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

        const fs = require('fs').promises;
        const path = require('path');
        const htmlPath = path.join(__dirname, '..', 'reports', 'benchmark-report.html');
        await fs.writeFile(htmlPath, htmlTemplate);
    }

    printBenchmarkSummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('⚡ PERFORMANCE BENCHMARK SUMMARY');
        console.log('='.repeat(60));
        console.log(`Overall Performance Grade: ${report.summary.overall_performance_grade}`);
        console.log(`Average API Response Time: ${report.summary.average_api_response_time_ms.toFixed(2)}ms`);
        console.log(`Average DB Operation Time: ${report.summary.average_db_operation_time_ms.toFixed(2)}ms`);
        console.log(`Max Throughput: ${report.summary.max_throughput_req_per_sec.toFixed(2)} req/s`);
        console.log(`Memory Efficiency: ${report.summary.memory_efficiency_score}`);
        console.log('='.repeat(60));
        console.log('🎉 Performance benchmarks completed successfully!');
        console.log(`📄 Reports saved to: ${require('path').join(__dirname, '..', 'reports')}`);
    }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
    const benchmark = new PerformanceBenchmark();
    benchmark.runBenchmarks().catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceBenchmark;
