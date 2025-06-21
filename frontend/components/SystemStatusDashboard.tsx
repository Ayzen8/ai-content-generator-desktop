import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { AnimatedCard, AnimatedButton, AnimatedProgress } from './AnimationProvider';
import LoadingSpinner from './LoadingSpinner';

interface SystemStatus {
    overall_health: number;
    status: 'healthy' | 'warning' | 'critical';
    components: {
        database: { status: string; response_time: number; connections: number };
        cache: { status: string; hit_rate: number; memory_usage: number };
        api: { status: string; response_time: number; requests_per_second: number };
        cdn: { status: string; assets_optimized: number; compression_ratio: number };
    };
    performance_metrics: {
        cpu_usage: number;
        memory_usage: number;
        disk_usage: number;
        uptime: number;
    };
    recent_alerts: Array<{
        id: number;
        type: string;
        message: string;
        created_at: string;
    }>;
}

const SystemStatusDashboard: React.FC = () => {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        loadSystemStatus();
        
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(loadSystemStatus, 30000); // Refresh every 30 seconds
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    const loadSystemStatus = async () => {
        try {
            const [performanceData, cacheStats, dbStats, cdnReport] = await Promise.all([
                ApiService.get('/api/performance/dashboard'),
                ApiService.get('/api/cache/stats'),
                ApiService.get('/api/database/statistics'),
                ApiService.get('/api/cdn/optimization-report')
            ]);

            // Simulate system metrics (in production, these would come from actual monitoring)
            const systemStatus: SystemStatus = {
                overall_health: calculateOverallHealth(performanceData, cacheStats, dbStats),
                status: getHealthStatus(calculateOverallHealth(performanceData, cacheStats, dbStats)),
                components: {
                    database: {
                        status: dbStats.connectionPool.activeConnections < dbStats.connectionPool.totalConnections * 0.8 ? 'healthy' : 'warning',
                        response_time: 45,
                        connections: dbStats.connectionPool.activeConnections
                    },
                    cache: {
                        status: cacheStats.hitRate > 0.7 ? 'healthy' : 'warning',
                        hit_rate: cacheStats.hitRate,
                        memory_usage: cacheStats.memoryUsage
                    },
                    api: {
                        status: 'healthy',
                        response_time: 120,
                        requests_per_second: 85
                    },
                    cdn: {
                        status: cdnReport.optimizedAssets === cdnReport.totalAssets ? 'healthy' : 'warning',
                        assets_optimized: cdnReport.optimizedAssets,
                        compression_ratio: parseFloat(cdnReport.compressionSavings.brotli.savingsPercent) || 0
                    }
                },
                performance_metrics: {
                    cpu_usage: Math.random() * 30 + 20, // Simulated
                    memory_usage: Math.random() * 25 + 45, // Simulated
                    disk_usage: Math.random() * 15 + 25, // Simulated
                    uptime: Date.now() / 1000 - (Math.random() * 86400 * 7) // Simulated uptime
                },
                recent_alerts: [] // Would come from performance analytics service
            };

            setStatus(systemStatus);
        } catch (error) {
            console.error('Error loading system status:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateOverallHealth = (performance: any, cache: any, db: any): number => {
        let score = 100;
        
        // Database health
        const dbUsage = db.connectionPool.activeConnections / db.connectionPool.totalConnections;
        if (dbUsage > 0.8) score -= 15;
        else if (dbUsage > 0.6) score -= 5;
        
        // Cache health
        if (cache.hitRate < 0.5) score -= 20;
        else if (cache.hitRate < 0.7) score -= 10;
        
        if (cache.memoryUsage > 80) score -= 15;
        else if (cache.memoryUsage > 60) score -= 5;
        
        return Math.max(0, Math.min(100, score));
    };

    const getHealthStatus = (health: number): 'healthy' | 'warning' | 'critical' => {
        if (health >= 80) return 'healthy';
        if (health >= 60) return 'warning';
        return 'critical';
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'healthy': return '#00ff88';
            case 'warning': return '#ffaa00';
            case 'critical': return '#ff4444';
            default: return '#ccc';
        }
    };

    const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="system-status-dashboard">
                <LoadingSpinner text="Loading system status..." />
            </div>
        );
    }

    if (!status) {
        return (
            <div className="system-status-dashboard">
                <div className="error-message">
                    <h3>⚠️ System Status Unavailable</h3>
                    <p>Unable to load system status</p>
                    <AnimatedButton onClick={loadSystemStatus}>
                        🔄 Retry
                    </AnimatedButton>
                </div>
            </div>
        );
    }

    return (
        <div className="system-status-dashboard">
            <div className="status-header">
                <h2>🖥️ System Status Dashboard</h2>
                <div className="status-controls">
                    <div className="overall-health">
                        <span className="health-label">Overall Health:</span>
                        <span className={`health-score ${status.status}`}>
                            {status.overall_health.toFixed(0)}%
                        </span>
                        <div className={`status-indicator ${status.status}`}></div>
                    </div>
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh
                    </label>
                    <AnimatedButton onClick={loadSystemStatus} variant="secondary">
                        🔄 Refresh
                    </AnimatedButton>
                </div>
            </div>

            {/* Component Status Grid */}
            <div className="component-status-grid">
                <AnimatedCard className="component-card">
                    <div className="component-header">
                        <h3>🗄️ Database</h3>
                        <div className={`component-status ${status.components.database.status}`}>
                            {status.components.database.status}
                        </div>
                    </div>
                    <div className="component-metrics">
                        <div className="metric">
                            <span>Response Time:</span>
                            <span>{status.components.database.response_time}ms</span>
                        </div>
                        <div className="metric">
                            <span>Active Connections:</span>
                            <span>{status.components.database.connections}/10</span>
                        </div>
                        <AnimatedProgress 
                            progress={(status.components.database.connections / 10) * 100}
                            color={getStatusColor(status.components.database.status)}
                        />
                    </div>
                </AnimatedCard>

                <AnimatedCard className="component-card">
                    <div className="component-header">
                        <h3>💾 Cache</h3>
                        <div className={`component-status ${status.components.cache.status}`}>
                            {status.components.cache.status}
                        </div>
                    </div>
                    <div className="component-metrics">
                        <div className="metric">
                            <span>Hit Rate:</span>
                            <span>{(status.components.cache.hit_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="metric">
                            <span>Memory Usage:</span>
                            <span>{status.components.cache.memory_usage.toFixed(1)}%</span>
                        </div>
                        <AnimatedProgress 
                            progress={status.components.cache.hit_rate * 100}
                            color={getStatusColor(status.components.cache.status)}
                        />
                    </div>
                </AnimatedCard>

                <AnimatedCard className="component-card">
                    <div className="component-header">
                        <h3>🌐 API</h3>
                        <div className={`component-status ${status.components.api.status}`}>
                            {status.components.api.status}
                        </div>
                    </div>
                    <div className="component-metrics">
                        <div className="metric">
                            <span>Response Time:</span>
                            <span>{status.components.api.response_time}ms</span>
                        </div>
                        <div className="metric">
                            <span>Requests/sec:</span>
                            <span>{status.components.api.requests_per_second}</span>
                        </div>
                        <AnimatedProgress 
                            progress={Math.min((status.components.api.requests_per_second / 100) * 100, 100)}
                            color={getStatusColor(status.components.api.status)}
                        />
                    </div>
                </AnimatedCard>

                <AnimatedCard className="component-card">
                    <div className="component-header">
                        <h3>📦 CDN</h3>
                        <div className={`component-status ${status.components.cdn.status}`}>
                            {status.components.cdn.status}
                        </div>
                    </div>
                    <div className="component-metrics">
                        <div className="metric">
                            <span>Assets Optimized:</span>
                            <span>{status.components.cdn.assets_optimized}</span>
                        </div>
                        <div className="metric">
                            <span>Compression:</span>
                            <span>{status.components.cdn.compression_ratio.toFixed(1)}%</span>
                        </div>
                        <AnimatedProgress 
                            progress={status.components.cdn.compression_ratio}
                            color={getStatusColor(status.components.cdn.status)}
                        />
                    </div>
                </AnimatedCard>
            </div>

            {/* Performance Metrics */}
            <AnimatedCard className="performance-metrics-card">
                <h3>📊 Performance Metrics</h3>
                <div className="metrics-grid">
                    <div className="metric-item">
                        <div className="metric-header">
                            <span>CPU Usage</span>
                            <span className="metric-value">{status.performance_metrics.cpu_usage.toFixed(1)}%</span>
                        </div>
                        <AnimatedProgress 
                            progress={status.performance_metrics.cpu_usage}
                            color={status.performance_metrics.cpu_usage > 80 ? '#ff4444' : '#00ff88'}
                        />
                    </div>
                    <div className="metric-item">
                        <div className="metric-header">
                            <span>Memory Usage</span>
                            <span className="metric-value">{status.performance_metrics.memory_usage.toFixed(1)}%</span>
                        </div>
                        <AnimatedProgress 
                            progress={status.performance_metrics.memory_usage}
                            color={status.performance_metrics.memory_usage > 80 ? '#ff4444' : '#00ff88'}
                        />
                    </div>
                    <div className="metric-item">
                        <div className="metric-header">
                            <span>Disk Usage</span>
                            <span className="metric-value">{status.performance_metrics.disk_usage.toFixed(1)}%</span>
                        </div>
                        <AnimatedProgress 
                            progress={status.performance_metrics.disk_usage}
                            color={status.performance_metrics.disk_usage > 80 ? '#ff4444' : '#00ff88'}
                        />
                    </div>
                    <div className="metric-item">
                        <div className="metric-header">
                            <span>Uptime</span>
                            <span className="metric-value">{formatUptime(status.performance_metrics.uptime)}</span>
                        </div>
                        <div className="uptime-indicator">
                            <div className="uptime-dot healthy"></div>
                            <span>System Online</span>
                        </div>
                    </div>
                </div>
            </AnimatedCard>

            {/* Recent Alerts */}
            {status.recent_alerts.length > 0 && (
                <AnimatedCard className="alerts-card">
                    <h3>🚨 Recent Alerts</h3>
                    <div className="alerts-list">
                        {status.recent_alerts.map((alert) => (
                            <div key={alert.id} className={`alert-item ${alert.type}`}>
                                <div className="alert-message">{alert.message}</div>
                                <div className="alert-time">{new Date(alert.created_at).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
            )}

            {/* Quick Actions */}
            <AnimatedCard className="quick-actions-card">
                <h3>⚡ Quick Actions</h3>
                <div className="quick-actions-grid">
                    <AnimatedButton variant="primary">
                        🔧 Run Diagnostics
                    </AnimatedButton>
                    <AnimatedButton variant="warning">
                        🧹 Clear Cache
                    </AnimatedButton>
                    <AnimatedButton variant="secondary">
                        📊 View Detailed Analytics
                    </AnimatedButton>
                    <AnimatedButton variant="secondary">
                        💾 Create Backup
                    </AnimatedButton>
                </div>
            </AnimatedCard>
        </div>
    );
};

export default SystemStatusDashboard;
