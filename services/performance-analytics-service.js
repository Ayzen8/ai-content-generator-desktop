const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

class PerformanceAnalyticsService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.metricsHistory = [];
        this.alertThresholds = {
            cpu: 80,
            memory: 85,
            diskSpace: 90,
            responseTime: 1000,
            errorRate: 0.05,
            cacheHitRate: 0.7
        };
        this.initializeAnalyticsTables();
        this.startMetricsCollection();
    }

    // Initialize performance analytics tables
    initializeAnalyticsTables() {
        const createAnalyticsTables = `
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL, -- 'system', 'api', 'database', 'cache'
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                unit TEXT, -- 'percent', 'ms', 'bytes', 'count'
                tags TEXT, -- JSON string for additional metadata
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS performance_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL, -- 'warning', 'critical'
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                threshold_value REAL NOT NULL,
                actual_value REAL NOT NULL,
                message TEXT NOT NULL,
                is_resolved BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS performance_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
                report_data TEXT NOT NULL, -- JSON string
                generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS optimization_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                optimization_type TEXT NOT NULL, -- 'database', 'cache', 'system'
                operation TEXT NOT NULL,
                before_metrics TEXT, -- JSON string
                after_metrics TEXT, -- JSON string
                improvement_percent REAL,
                performed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_time ON performance_metrics (metric_type, recorded_at);
            CREATE INDEX IF NOT EXISTS idx_performance_alerts_type ON performance_alerts (alert_type, is_resolved);
        `;

        this.db.exec(createAnalyticsTables, (err) => {
            if (err) {
                console.error('Error creating performance analytics tables:', err);
            } else {
                console.log('✅ Performance analytics tables initialized');
            }
        });
    }

    // Start continuous metrics collection
    startMetricsCollection() {
        // Collect system metrics every 30 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);

        // Collect application metrics every minute
        setInterval(() => {
            this.collectApplicationMetrics();
        }, 60000);

        // Generate reports daily
        setInterval(() => {
            this.generateDailyReport();
        }, 24 * 60 * 60 * 1000);

        // Check for alerts every 2 minutes
        setInterval(() => {
            this.checkAlerts();
        }, 2 * 60 * 1000);
    }

    // Collect system-level metrics
    async collectSystemMetrics() {
        try {
            const cpuUsage = await this.getCPUUsage();
            const memoryUsage = this.getMemoryUsage();
            const diskUsage = await this.getDiskUsage();
            const uptime = os.uptime();

            const metrics = [
                { type: 'system', name: 'cpu_usage', value: cpuUsage, unit: 'percent' },
                { type: 'system', name: 'memory_usage', value: memoryUsage, unit: 'percent' },
                { type: 'system', name: 'disk_usage', value: diskUsage, unit: 'percent' },
                { type: 'system', name: 'uptime', value: uptime, unit: 'seconds' }
            ];

            for (const metric of metrics) {
                await this.recordMetric(metric.type, metric.name, metric.value, metric.unit);
            }

        } catch (error) {
            console.error('Error collecting system metrics:', error);
        }
    }

    // Collect application-specific metrics
    async collectApplicationMetrics() {
        try {
            // Get database metrics
            const dbStats = await this.getDatabaseMetrics();
            
            // Get cache metrics
            const cacheStats = await this.getCacheMetrics();
            
            // Record metrics
            await this.recordMetric('database', 'connection_pool_usage', 
                (dbStats.activeConnections / dbStats.totalConnections) * 100, 'percent');
            
            await this.recordMetric('cache', 'hit_rate', cacheStats.hitRate * 100, 'percent');
            await this.recordMetric('cache', 'memory_usage', cacheStats.memoryUsage, 'percent');

        } catch (error) {
            console.error('Error collecting application metrics:', error);
        }
    }

    // Get CPU usage percentage
    async getCPUUsage() {
        return new Promise((resolve) => {
            const startMeasure = this.cpuAverage();
            
            setTimeout(() => {
                const endMeasure = this.cpuAverage();
                const idleDifference = endMeasure.idle - startMeasure.idle;
                const totalDifference = endMeasure.total - startMeasure.total;
                const cpuPercentage = 100 - ~~(100 * idleDifference / totalDifference);
                resolve(cpuPercentage);
            }, 1000);
        });
    }

    // Helper function for CPU measurement
    cpuAverage() {
        const cpus = os.cpus();
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
        
        for (const cpu of cpus) {
            user += cpu.times.user;
            nice += cpu.times.nice;
            sys += cpu.times.sys;
            idle += cpu.times.idle;
            irq += cpu.times.irq;
        }
        
        const total = user + nice + sys + idle + irq;
        return { idle, total };
    }

    // Get memory usage percentage
    getMemoryUsage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        return (usedMemory / totalMemory) * 100;
    }

    // Get disk usage percentage
    async getDiskUsage() {
        try {
            const fs = require('fs').promises;
            const stats = await fs.stat(this.dbPath);
            // This is a simplified calculation - in production you'd use a proper disk usage library
            return Math.min((stats.size / (1024 * 1024 * 1024)) * 10, 100); // Rough estimate
        } catch (error) {
            return 0;
        }
    }

    // Get database metrics
    async getDatabaseMetrics() {
        // This would integrate with the database optimization service
        return {
            totalConnections: 10,
            activeConnections: 3,
            queryTime: 50,
            cacheHitRate: 0.8
        };
    }

    // Get cache metrics
    async getCacheMetrics() {
        // This would integrate with the advanced caching service
        return {
            hitRate: 0.85,
            memoryUsage: 45,
            entriesCount: 1500
        };
    }

    // Record a metric
    async recordMetric(type, name, value, unit = null, tags = {}) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO performance_metrics (metric_type, metric_name, metric_value, unit, tags)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(query, [type, name, value, unit, JSON.stringify(tags)], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Check for performance alerts
    async checkAlerts() {
        try {
            const recentMetrics = await this.getRecentMetrics(5); // Last 5 minutes
            
            for (const metric of recentMetrics) {
                await this.evaluateMetricForAlerts(metric);
            }

        } catch (error) {
            console.error('Error checking alerts:', error);
        }
    }

    // Evaluate a metric against alert thresholds
    async evaluateMetricForAlerts(metric) {
        let threshold = null;
        let alertType = 'warning';

        switch (metric.metric_name) {
            case 'cpu_usage':
                threshold = this.alertThresholds.cpu;
                if (metric.metric_value > 95) alertType = 'critical';
                break;
            case 'memory_usage':
                threshold = this.alertThresholds.memory;
                if (metric.metric_value > 95) alertType = 'critical';
                break;
            case 'disk_usage':
                threshold = this.alertThresholds.diskSpace;
                if (metric.metric_value > 98) alertType = 'critical';
                break;
            default:
                return; // No threshold defined for this metric
        }

        if (threshold && metric.metric_value > threshold) {
            await this.createAlert(alertType, metric.metric_type, metric.metric_name, 
                threshold, metric.metric_value);
        }
    }

    // Create a performance alert
    async createAlert(alertType, metricType, metricName, threshold, actualValue) {
        const message = `${metricType} ${metricName} is ${actualValue.toFixed(2)}% (threshold: ${threshold}%)`;
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO performance_alerts 
                (alert_type, metric_type, metric_name, threshold_value, actual_value, message)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [alertType, metricType, metricName, threshold, actualValue, message], 
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`🚨 ${alertType.toUpperCase()} ALERT: ${message}`);
                        resolve(this.lastID);
                    }
                });
        });
    }

    // Get recent metrics
    async getRecentMetrics(minutes = 60) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM performance_metrics 
                WHERE recorded_at > datetime('now', '-${minutes} minutes')
                ORDER BY recorded_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get performance trends
    async getPerformanceTrends(hours = 24) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    metric_type,
                    metric_name,
                    AVG(metric_value) as avg_value,
                    MIN(metric_value) as min_value,
                    MAX(metric_value) as max_value,
                    COUNT(*) as data_points,
                    strftime('%Y-%m-%d %H:00:00', recorded_at) as hour_bucket
                FROM performance_metrics 
                WHERE recorded_at > datetime('now', '-${hours} hours')
                GROUP BY metric_type, metric_name, hour_bucket
                ORDER BY hour_bucket DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get active alerts
    async getActiveAlerts() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM performance_alerts 
                WHERE is_resolved = 0
                ORDER BY created_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Generate daily performance report
    async generateDailyReport() {
        try {
            const trends = await this.getPerformanceTrends(24);
            const alerts = await this.getActiveAlerts();
            
            const report = {
                date: new Date().toISOString().split('T')[0],
                summary: {
                    total_metrics: trends.length,
                    active_alerts: alerts.length,
                    avg_cpu_usage: this.calculateAverageForMetric(trends, 'cpu_usage'),
                    avg_memory_usage: this.calculateAverageForMetric(trends, 'memory_usage'),
                    cache_performance: this.calculateAverageForMetric(trends, 'hit_rate')
                },
                trends,
                alerts,
                recommendations: await this.generateRecommendations(trends, alerts)
            };

            await this.saveReport('daily', report);
            console.log('📊 Daily performance report generated');

        } catch (error) {
            console.error('Error generating daily report:', error);
        }
    }

    // Calculate average for a specific metric
    calculateAverageForMetric(trends, metricName) {
        const metricData = trends.filter(t => t.metric_name === metricName);
        if (metricData.length === 0) return 0;
        
        const sum = metricData.reduce((acc, item) => acc + item.avg_value, 0);
        return sum / metricData.length;
    }

    // Generate performance recommendations
    async generateRecommendations(trends, alerts) {
        const recommendations = [];

        // Check CPU usage
        const avgCPU = this.calculateAverageForMetric(trends, 'cpu_usage');
        if (avgCPU > 70) {
            recommendations.push({
                type: 'performance',
                priority: avgCPU > 85 ? 'high' : 'medium',
                title: 'High CPU Usage Detected',
                description: `Average CPU usage is ${avgCPU.toFixed(1)}%`,
                action: 'Consider optimizing database queries or adding more processing power'
            });
        }

        // Check memory usage
        const avgMemory = this.calculateAverageForMetric(trends, 'memory_usage');
        if (avgMemory > 75) {
            recommendations.push({
                type: 'memory',
                priority: avgMemory > 90 ? 'high' : 'medium',
                title: 'High Memory Usage Detected',
                description: `Average memory usage is ${avgMemory.toFixed(1)}%`,
                action: 'Consider implementing memory optimization or increasing available RAM'
            });
        }

        // Check cache performance
        const avgCacheHit = this.calculateAverageForMetric(trends, 'hit_rate');
        if (avgCacheHit < 70) {
            recommendations.push({
                type: 'cache',
                priority: 'medium',
                title: 'Low Cache Hit Rate',
                description: `Cache hit rate is ${avgCacheHit.toFixed(1)}%`,
                action: 'Review caching strategy and increase cache TTL for frequently accessed data'
            });
        }

        return recommendations;
    }

    // Save performance report
    async saveReport(type, reportData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO performance_reports (report_type, report_data)
                VALUES (?, ?)
            `;

            this.db.run(query, [type, JSON.stringify(reportData)], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get comprehensive performance dashboard data
    async getPerformanceDashboard() {
        try {
            const [recentMetrics, trends, alerts, reports] = await Promise.all([
                this.getRecentMetrics(60),
                this.getPerformanceTrends(24),
                this.getActiveAlerts(),
                this.getRecentReports(7)
            ]);

            return {
                current_metrics: this.formatCurrentMetrics(recentMetrics),
                trends: this.formatTrends(trends),
                active_alerts: alerts,
                recent_reports: reports,
                health_score: this.calculateHealthScore(recentMetrics, alerts),
                generated_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting performance dashboard:', error);
            throw error;
        }
    }

    // Format current metrics for dashboard
    formatCurrentMetrics(metrics) {
        const latest = {};
        
        for (const metric of metrics) {
            const key = `${metric.metric_type}_${metric.metric_name}`;
            if (!latest[key] || new Date(metric.recorded_at) > new Date(latest[key].recorded_at)) {
                latest[key] = metric;
            }
        }

        return Object.values(latest);
    }

    // Format trends for dashboard
    formatTrends(trends) {
        const formatted = {};
        
        for (const trend of trends) {
            const key = `${trend.metric_type}_${trend.metric_name}`;
            if (!formatted[key]) {
                formatted[key] = [];
            }
            formatted[key].push(trend);
        }

        return formatted;
    }

    // Calculate overall health score
    calculateHealthScore(metrics, alerts) {
        let score = 100;
        
        // Deduct points for high resource usage
        const latestMetrics = this.formatCurrentMetrics(metrics);
        for (const metric of latestMetrics) {
            if (metric.metric_name === 'cpu_usage' && metric.metric_value > 80) {
                score -= 20;
            }
            if (metric.metric_name === 'memory_usage' && metric.metric_value > 85) {
                score -= 15;
            }
        }

        // Deduct points for active alerts
        score -= alerts.length * 10;

        return Math.max(0, Math.min(100, score));
    }

    // Get recent reports
    async getRecentReports(days = 7) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM performance_reports 
                WHERE generated_at > datetime('now', '-${days} days')
                ORDER BY generated_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        report_data: JSON.parse(row.report_data)
                    })));
                }
            });
        });
    }
}

module.exports = new PerformanceAnalyticsService();
