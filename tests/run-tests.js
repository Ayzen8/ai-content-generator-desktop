#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class TestRunner {
    constructor() {
        this.testResults = {
            unit: { passed: 0, failed: 0, total: 0 },
            integration: { passed: 0, failed: 0, total: 0 },
            e2e: { passed: 0, failed: 0, total: 0 }
        };
        this.startTime = Date.now();
    }

    async runTests() {
        console.log('🚀 Starting AI Content Generator Test Suite\n');
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Run test suites
            await this.runUnitTests();
            await this.runIntegrationTests();
            await this.runE2ETests();
            
            // Generate test report
            await this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Ensure test directories exist
        const testDirs = ['unit', 'integration', 'e2e', 'reports'];
        for (const dir of testDirs) {
            const dirPath = path.join(__dirname, dir);
            try {
                await fs.mkdir(dirPath, { recursive: true });
            } catch (error) {
                // Directory already exists
            }
        }
        
        // Set test environment variables
        process.env.NODE_ENV = 'test';
        process.env.TEST_MODE = 'true';
        
        console.log('✅ Test environment ready\n');
    }

    async runUnitTests() {
        console.log('📋 Running Unit Tests...');
        console.log('=' .repeat(50));
        
        const result = await this.runMochaTests('unit/**/*.test.js');
        this.testResults.unit = result;
        
        console.log(`Unit Tests: ${result.passed} passed, ${result.failed} failed\n`);
    }

    async runIntegrationTests() {
        console.log('🔗 Running Integration Tests...');
        console.log('=' .repeat(50));
        
        const result = await this.runMochaTests('integration/**/*.test.js');
        this.testResults.integration = result;
        
        console.log(`Integration Tests: ${result.passed} passed, ${result.failed} failed\n`);
    }

    async runE2ETests() {
        console.log('🎯 Running End-to-End Tests...');
        console.log('=' .repeat(50));
        
        const result = await this.runMochaTests('e2e/**/*.test.js');
        this.testResults.e2e = result;
        
        console.log(`E2E Tests: ${result.passed} passed, ${result.failed} failed\n`);
    }

    async runMochaTests(pattern) {
        return new Promise((resolve) => {
            // Use the correct mocha path for Windows
            const isWindows = process.platform === 'win32';
            const mochaPath = path.join(__dirname, '..', 'node_modules', '.bin', isWindows ? 'mocha.cmd' : 'mocha');
            const testPattern = path.join(__dirname, pattern);

            const mocha = spawn(isWindows ? 'cmd' : 'node', [
                ...(isWindows ? ['/c', mochaPath] : [mochaPath]),
                testPattern,
                '--require', path.join(__dirname, 'setup.js'),
                '--timeout', '30000',
                '--reporter', 'spec',
                '--recursive'
            ], {
                stdio: 'pipe',
                cwd: path.join(__dirname, '..')
            });

            let output = '';
            let passed = 0;
            let failed = 0;

            mocha.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                process.stdout.write(text);

                // Count passed and failed tests
                const passedMatches = text.match(/✔/g);
                const failedMatches = text.match(/\d+\) /g);

                if (passedMatches) passed += passedMatches.length;
                if (failedMatches) failed += failedMatches.length;
            });

            mocha.stderr.on('data', (data) => {
                const text = data.toString();
                output += text;
                process.stderr.write(text);
            });

            mocha.on('close', (code) => {
                // Try to parse the final summary for more accurate counts
                const summaryMatch = output.match(/(\d+) passing/);
                const failingMatch = output.match(/(\d+) failing/);

                if (summaryMatch) {
                    passed = parseInt(summaryMatch[1]);
                }
                if (failingMatch) {
                    failed = parseInt(failingMatch[1]);
                }

                const total = passed + failed;
                resolve({ passed, failed, total, exitCode: code, output });
            });
        });
    }

    async generateTestReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const totalPassed = this.testResults.unit.passed + this.testResults.integration.passed + this.testResults.e2e.passed;
        const totalFailed = this.testResults.unit.failed + this.testResults.integration.failed + this.testResults.e2e.failed;
        const totalTests = totalPassed + totalFailed;
        
        const report = {
            summary: {
                total_tests: totalTests,
                passed: totalPassed,
                failed: totalFailed,
                success_rate: totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(2) : 0,
                duration_ms: duration,
                duration_formatted: this.formatDuration(duration)
            },
            results: this.testResults,
            timestamp: new Date().toISOString(),
            environment: {
                node_version: process.version,
                platform: process.platform,
                memory_usage: process.memoryUsage()
            }
        };

        // Save JSON report
        const reportPath = path.join(__dirname, 'reports', 'test-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Generate HTML report
        await this.generateHTMLReport(report);

        // Print summary
        this.printTestSummary(report);
    }

    async generateHTMLReport(report) {
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Content Generator - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .results { margin-top: 30px; }
        .test-suite { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .test-suite h3 { margin: 0 0 10px 0; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .timestamp { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AI Content Generator Test Report</h1>
            <p>Comprehensive test results for all application components</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.total_tests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${report.summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${report.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value">${report.summary.success_rate}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${report.summary.duration_formatted}</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Suite Results</h2>
            
            <div class="test-suite">
                <h3>📋 Unit Tests</h3>
                <p>Passed: ${report.results.unit.passed} | Failed: ${report.results.unit.failed} | Total: ${report.results.unit.total}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.results.unit.total > 0 ? (report.results.unit.passed / report.results.unit.total * 100) : 0}%"></div>
                </div>
            </div>
            
            <div class="test-suite">
                <h3>🔗 Integration Tests</h3>
                <p>Passed: ${report.results.integration.passed} | Failed: ${report.results.integration.failed} | Total: ${report.results.integration.total}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.results.integration.total > 0 ? (report.results.integration.passed / report.results.integration.total * 100) : 0}%"></div>
                </div>
            </div>
            
            <div class="test-suite">
                <h3>🎯 End-to-End Tests</h3>
                <p>Passed: ${report.results.e2e.passed} | Failed: ${report.results.e2e.failed} | Total: ${report.results.e2e.total}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.results.e2e.total > 0 ? (report.results.e2e.passed / report.results.e2e.total * 100) : 0}%"></div>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

        const htmlPath = path.join(__dirname, 'reports', 'test-report.html');
        await fs.writeFile(htmlPath, htmlTemplate);
    }

    printTestSummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${report.summary.total_tests}`);
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`📈 Success Rate: ${report.summary.success_rate}%`);
        console.log(`⏱️  Duration: ${report.summary.duration_formatted}`);
        console.log('='.repeat(60));
        
        if (report.summary.failed > 0) {
            console.log('❌ Some tests failed. Check the detailed output above.');
            process.exit(1);
        } else {
            console.log('🎉 All tests passed successfully!');
            console.log(`📄 Reports saved to: ${path.join(__dirname, 'reports')}`);
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;
