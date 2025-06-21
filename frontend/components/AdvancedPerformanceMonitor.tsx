import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';
import { AnimatedCard, AnimatedButton, AnimatedProgress } from './AnimationProvider';
import LoadingSpinner from './LoadingSpinner';

interface PerformanceMetrics {
    system: {
        cpu_usage: number;
        memory_usage: number;
        disk_usage: number;
        uptime: number;
    };
    cache: {
        hitRate: number;
        memoryUsage: number;
        entriesInMemory: number;
        totalHits: number;
        totalMisses: number;
    };
    database: {
        connectionPool: {
            totalConnections: number;
            activeConnections: number;
            availableConnections: number;
        };
        queryCache: {
            entries: number;
            hitRate: number;
        };
        databaseSize: number;
    };
    api: {
        averageResponseTime: number;
        requestsPerSecond: number;
        errorRate: number;
        totalRequests: number;
    };
}

interface OptimizationSuggestion {
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: string;
    action: string;
}

const AdvancedPerformanceMonitor: React.FC = () => {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [realTimeEnabled, setRealTimeEnabled] = useState(false);
    const [historicalData, setHistoricalData] = useState<any[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadPerformanceData();
        loadOptimizationSuggestions();
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (realTimeEnabled) {
            intervalRef.current = setInterval(() => {
                loadPerformanceData();
            }, 5000); // Update every 5 seconds
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, [realTimeEnabled]);

    const loadPerformanceData = async () => {
        try {
            const [dashboardData, cacheStats, dbStats] = await Promise.all([
                ApiService.get('/api/performance/dashboard'),
                ApiService.get('/api/cache/stats'),
                ApiService.get('/api/database/statistics')
            ]);

            const combinedMetrics: PerformanceMetrics = {
                system: dashboardData.system_statistics || {
                    cpu_usage: 0,
                    memory_usage: 0,
                    disk_usage: 0,
                    uptime: 0
                },
                cache: cacheStats,
                database: dbStats,
                api: {
                    averageResponseTime: 50,
                    requestsPerSecond: 100,
                    errorRate: 0.01,
                    totalRequests: 10000
                }
            };

            setMetrics(combinedMetrics);
            
            // Add to historical data
            setHistoricalData(prev => {
                const newData = [...prev, {
                    timestamp: Date.now(),
                    ...combinedMetrics
                }].slice(-50); // Keep last 50 data points
                return newData;
            });

        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOptimizationSuggestions = async () => {
        try {
            const suggestions = await ApiService.get('/api/database/optimization-suggestions');
            setSuggestions(suggestions);
        } catch (error) {
            console.error('Error loading optimization suggestions:', error);
        }
    };

    const optimizeDatabase = async (operation: string) => {
        try {
            setLoading(true);
            await ApiService.post('/api/database/optimize', { operation });
            alert(`✅ Database ${operation} completed successfully!`);
            await loadPerformanceData();
        } catch (error) {
            console.error(`Error performing ${operation}:`, error);
            alert(`❌ Failed to perform ${operation}`);
        } finally {
            setLoading(false);
        }
    };

    const clearCache = async (tags: string[]) => {
        try {
            await ApiService.post('/api/cache/invalidate', { tags });
            alert(`✅ Cache cleared for tags: ${tags.join(', ')}`);
            await loadPerformanceData();
        } catch (error) {
            console.error('Error clearing cache:', error);
            alert('❌ Failed to clear cache');
        }
    };

    const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
        if (value <= thresholds.good) return 'good';
        if (value <= thresholds.warning) return 'warning';
        return 'critical';
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    if (loading && !metrics) {
        return (
            <div className="performance-monitor">
                <LoadingSpinner text="Loading performance metrics..." />
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="performance-monitor">
                <div className="error-message">
                    <h3>⚠️ Performance Data Unavailable</h3>
                    <p>Unable to load performance metrics</p>
                    <AnimatedButton onClick={loadPerformanceData}>
                        🔄 Retry
                    </AnimatedButton>
                </div>
            </div>
        );
    }

    return (
        <div className="performance-monitor">
            <div className="monitor-header">
                <h2>📊 Advanced Performance Monitor</h2>
                <div className="monitor-controls">
                    <label className="real-time-toggle">
                        <input
                            type="checkbox"
                            checked={realTimeEnabled}
                            onChange={(e) => setRealTimeEnabled(e.target.checked)}
                        />
                        Real-time monitoring
                    </label>
                    <AnimatedButton onClick={loadPerformanceData} variant="secondary">
                        🔄 Refresh
                    </AnimatedButton>
                </div>
            </div>

            {/* System Health Overview */}
            <div className="health-overview">
                <AnimatedCard className="health-card">
                    <h3>🖥️ System Health</h3>
                    <div className="health-metrics">
                        <div className="health-metric">
                            <span>CPU Usage</span>
                            <div className={`health-value ${getHealthStatus(metrics.system.cpu_usage, { good: 70, warning: 85 })}`}>
                                {metrics.system.cpu_usage.toFixed(1)}%
                            </div>
                            <AnimatedProgress 
                                progress={metrics.system.cpu_usage} 
                                color={getHealthStatus(metrics.system.cpu_usage, { good: 70, warning: 85 }) === 'good' ? '#00ff88' : '#ff4444'}
                            />
                        </div>
                        <div className="health-metric">
                            <span>Memory Usage</span>
                            <div className={`health-value ${getHealthStatus(metrics.system.memory_usage, { good: 70, warning: 85 })}`}>
                                {metrics.system.memory_usage.toFixed(1)}%
                            </div>
                            <AnimatedProgress 
                                progress={metrics.system.memory_usage} 
                                color={getHealthStatus(metrics.system.memory_usage, { good: 70, warning: 85 }) === 'good' ? '#00ff88' : '#ff4444'}
                            />
                        </div>
                        <div className="health-metric">
                            <span>Uptime</span>
                            <div className="health-value good">
                                {formatUptime(metrics.system.uptime)}
                            </div>
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="health-card">
                    <h3>💾 Cache Performance</h3>
                    <div className="cache-metrics">
                        <div className="cache-metric">
                            <span>Hit Rate</span>
                            <div className={`cache-value ${getHealthStatus(100 - metrics.cache.hitRate * 100, { good: 20, warning: 40 })}`}>
                                {(metrics.cache.hitRate * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="cache-metric">
                            <span>Memory Usage</span>
                            <div className="cache-value">
                                {metrics.cache.memoryUsage.toFixed(1)}%
                            </div>
                        </div>
                        <div className="cache-metric">
                            <span>Entries</span>
                            <div className="cache-value">
                                {metrics.cache.entriesInMemory.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="health-card">
                    <h3>🗄️ Database Status</h3>
                    <div className="db-metrics">
                        <div className="db-metric">
                            <span>Connections</span>
                            <div className="db-value">
                                {metrics.database.connectionPool.activeConnections}/{metrics.database.connectionPool.totalConnections}
                            </div>
                        </div>
                        <div className="db-metric">
                            <span>Query Cache</span>
                            <div className="db-value">
                                {(metrics.database.queryCache.hitRate * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="db-metric">
                            <span>Size</span>
                            <div className="db-value">
                                {formatBytes(metrics.database.databaseSize)}
                            </div>
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            {/* Quick Actions */}
            <AnimatedCard className="quick-actions-card">
                <h3>⚡ Quick Optimizations</h3>
                <div className="quick-actions">
                    <AnimatedButton 
                        onClick={() => optimizeDatabase('vacuum')}
                        variant="primary"
                        disabled={loading}
                    >
                        🧹 Vacuum Database
                    </AnimatedButton>
                    <AnimatedButton 
                        onClick={() => optimizeDatabase('analyze')}
                        variant="primary"
                        disabled={loading}
                    >
                        📊 Analyze Database
                    </AnimatedButton>
                    <AnimatedButton 
                        onClick={() => clearCache(['content', 'analytics'])}
                        variant="warning"
                    >
                        🗑️ Clear Cache
                    </AnimatedButton>
                    <AnimatedButton 
                        onClick={() => optimizeDatabase('backup')}
                        variant="secondary"
                        disabled={loading}
                    >
                        💾 Create Backup
                    </AnimatedButton>
                </div>
            </AnimatedCard>

            {/* Optimization Suggestions */}
            {suggestions.length > 0 && (
                <AnimatedCard className="suggestions-card">
                    <h3>💡 Optimization Suggestions</h3>
                    <div className="suggestions-list">
                        {suggestions.map((suggestion, index) => (
                            <div key={index} className={`suggestion-item priority-${suggestion.priority}`}>
                                <div className="suggestion-header">
                                    <span className="suggestion-title">{suggestion.title}</span>
                                    <span className={`priority-badge ${suggestion.priority}`}>
                                        {suggestion.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div className="suggestion-description">{suggestion.description}</div>
                                <div className="suggestion-impact">Impact: {suggestion.impact}</div>
                                <div className="suggestion-action">Action: {suggestion.action}</div>
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
            )}

            {/* Real-time Chart Placeholder */}
            {realTimeEnabled && historicalData.length > 0 && (
                <AnimatedCard className="chart-card">
                    <h3>📈 Real-time Performance Trends</h3>
                    <div className="chart-placeholder">
                        <p>Real-time performance chart would be displayed here</p>
                        <p>Data points: {historicalData.length}</p>
                        <p>Latest CPU: {metrics.system.cpu_usage.toFixed(1)}%</p>
                        <p>Latest Memory: {metrics.system.memory_usage.toFixed(1)}%</p>
                        <p>Cache Hit Rate: {(metrics.cache.hitRate * 100).toFixed(1)}%</p>
                    </div>
                </AnimatedCard>
            )}
        </div>
    );
};

export default AdvancedPerformanceMonitor;
