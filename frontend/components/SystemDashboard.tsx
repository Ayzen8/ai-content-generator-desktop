import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { AnimatedCard, AnimatedButton, AnimatedProgress } from './AnimationProvider';
import LoadingSpinner from './LoadingSpinner';

interface SystemHealth {
    database: string;
    memory: string;
    errors: string;
    overall: string;
}

interface DatabaseStats {
    databaseSize: number;
    tables: { [key: string]: { rowCount: number; estimatedSize: number } };
    performance: {
        slowQueries: Array<{ query_pattern: string; avg_time: number; count: number }>;
        averageQueryTime: number;
    };
    lastMaintenance: Array<{
        operation_type: string;
        duration_ms: number;
        status: string;
        performed_at: string;
    }>;
}

interface ErrorStats {
    category: string;
    severity: string;
    count: number;
    resolved_count: number;
    avg_retries: number;
}

interface TwitterStatus {
    connected: boolean;
    user?: any;
    rateLimits?: any;
    error?: string;
}

const SystemDashboard: React.FC = () => {
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
    const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
    const [twitterStatus, setTwitterStatus] = useState<TwitterStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'errors' | 'twitter'>('overview');
    const [optimizing, setOptimizing] = useState(false);

    useEffect(() => {
        loadSystemData();
        const interval = setInterval(loadSystemData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const loadSystemData = async () => {
        try {
            setLoading(true);
            const [healthData, dbStatsData, errorStatsData, twitterStatusData] = await Promise.all([
                ApiService.get('/api/system/health'),
                ApiService.get('/api/database/stats'),
                ApiService.get('/api/system/errors?timeframe=24h'),
                ApiService.get('/api/twitter/status').catch(() => ({ connected: false, error: 'Not configured' }))
            ]);

            setSystemHealth(healthData);
            setDatabaseStats(dbStatsData);
            setErrorStats(errorStatsData);
            setTwitterStatus(twitterStatusData);
        } catch (error) {
            console.error('Error loading system data:', error);
        } finally {
            setLoading(false);
        }
    };

    const performDatabaseOptimization = async () => {
        try {
            setOptimizing(true);
            const result = await ApiService.post('/api/database/optimize', {});

            if (result.success) {
                alert('✅ Database optimization completed successfully!');
                loadSystemData(); // Refresh data
            } else {
                alert('❌ Database optimization failed: ' + result.error);
            }
        } catch (error) {
            console.error('Error optimizing database:', error);
            alert('❌ Database optimization failed');
        } finally {
            setOptimizing(false);
        }
    };

    const createDatabaseBackup = async () => {
        try {
            const result = await ApiService.post('/api/database/backup', {});

            if (result.success) {
                alert(`✅ Database backup created: ${result.backupFile}`);
            } else {
                alert('❌ Database backup failed');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('❌ Database backup failed');
        }
    };

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'healthy': return '#00ff88';
            case 'warning': return '#ffaa00';
            case 'critical': return '#ff4444';
            default: return '#ccc';
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading && !systemHealth) {
        return (
            <div className="system-dashboard">
                <div className="dashboard-header">
                    <h2>🔧 System Dashboard</h2>
                </div>
                <LoadingSpinner text="Loading system data..." />
            </div>
        );
    }

    return (
        <div className="system-dashboard">
            <div className="dashboard-header">
                <h2>🔧 System Dashboard</h2>
                <p>Monitor and optimize your AI Content Generator</p>
            </div>

            {/* Tab Navigation */}
            <div className="dashboard-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Overview
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                    onClick={() => setActiveTab('database')}
                >
                    🗄️ Database
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'errors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('errors')}
                >
                    🚨 Errors
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'twitter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('twitter')}
                >
                    🐦 Twitter
                </button>
            </div>

            {activeTab === 'overview' && systemHealth && (
                <div className="overview-content">
                    {/* System Health Cards */}
                    <div className="health-cards">
                        <AnimatedCard className="health-card">
                            <div className="health-header">
                                <h3>🏥 System Health</h3>
                                <div 
                                    className="health-indicator"
                                    style={{ backgroundColor: getHealthColor(systemHealth.overall) }}
                                >
                                    {systemHealth.overall.toUpperCase()}
                                </div>
                            </div>
                            <div className="health-metrics">
                                <div className="health-metric">
                                    <span>Database:</span>
                                    <span style={{ color: getHealthColor(systemHealth.database) }}>
                                        {systemHealth.database}
                                    </span>
                                </div>
                                <div className="health-metric">
                                    <span>Memory:</span>
                                    <span style={{ color: getHealthColor(systemHealth.memory) }}>
                                        {systemHealth.memory}
                                    </span>
                                </div>
                                <div className="health-metric">
                                    <span>Errors:</span>
                                    <span style={{ color: getHealthColor(systemHealth.errors) }}>
                                        {systemHealth.errors}
                                    </span>
                                </div>
                            </div>
                        </AnimatedCard>

                        <AnimatedCard className="health-card">
                            <div className="health-header">
                                <h3>🗄️ Database</h3>
                                <div className="health-value">
                                    {databaseStats ? formatBytes(databaseStats.databaseSize) : 'Loading...'}
                                </div>
                            </div>
                            <div className="health-actions">
                                <AnimatedButton
                                    variant="secondary"
                                    size="small"
                                    onClick={createDatabaseBackup}
                                >
                                    💾 Backup
                                </AnimatedButton>
                                <AnimatedButton
                                    variant="primary"
                                    size="small"
                                    onClick={performDatabaseOptimization}
                                    loading={optimizing}
                                >
                                    ⚡ Optimize
                                </AnimatedButton>
                            </div>
                        </AnimatedCard>

                        <AnimatedCard className="health-card">
                            <div className="health-header">
                                <h3>🚨 Recent Errors</h3>
                                <div className="health-value">
                                    {errorStats.reduce((sum, stat) => sum + stat.count, 0)}
                                </div>
                            </div>
                            <div className="error-breakdown">
                                {errorStats.slice(0, 3).map((stat, index) => (
                                    <div key={index} className="error-stat">
                                        <span>{stat.category}:</span>
                                        <span>{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </AnimatedCard>

                        <AnimatedCard className="health-card">
                            <div className="health-header">
                                <h3>🐦 Twitter Status</h3>
                                <div 
                                    className="health-indicator"
                                    style={{ backgroundColor: twitterStatus?.connected ? '#00ff88' : '#ff4444' }}
                                >
                                    {twitterStatus?.connected ? 'CONNECTED' : 'DISCONNECTED'}
                                </div>
                            </div>
                            {twitterStatus?.connected && twitterStatus.user && (
                                <div className="twitter-info">
                                    <div>@{twitterStatus.user.username}</div>
                                    <div>{twitterStatus.user.public_metrics?.followers_count || 0} followers</div>
                                </div>
                            )}
                        </AnimatedCard>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <h3>⚡ Quick Actions</h3>
                        <div className="actions-grid">
                            <AnimatedButton
                                variant="primary"
                                onClick={performDatabaseOptimization}
                                loading={optimizing}
                            >
                                🔧 Optimize Database
                            </AnimatedButton>
                            <AnimatedButton
                                variant="secondary"
                                onClick={createDatabaseBackup}
                            >
                                💾 Create Backup
                            </AnimatedButton>
                            <AnimatedButton
                                variant="secondary"
                                onClick={loadSystemData}
                            >
                                🔄 Refresh Data
                            </AnimatedButton>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'database' && databaseStats && (
                <div className="database-content">
                    <div className="database-overview">
                        <AnimatedCard>
                            <h3>📊 Database Overview</h3>
                            <div className="db-stats">
                                <div className="db-stat">
                                    <span>Total Size:</span>
                                    <span>{formatBytes(databaseStats.databaseSize)}</span>
                                </div>
                                <div className="db-stat">
                                    <span>Tables:</span>
                                    <span>{Object.keys(databaseStats.tables).length}</span>
                                </div>
                                <div className="db-stat">
                                    <span>Avg Query Time:</span>
                                    <span>{databaseStats.performance.averageQueryTime.toFixed(2)}ms</span>
                                </div>
                            </div>
                        </AnimatedCard>
                    </div>

                    <div className="tables-overview">
                        <h3>📋 Tables</h3>
                        <div className="tables-grid">
                            {Object.entries(databaseStats.tables).map(([tableName, stats]) => (
                                <AnimatedCard key={tableName} className="table-card">
                                    <h4>{tableName}</h4>
                                    <div className="table-stats">
                                        <div>Rows: {stats.rowCount.toLocaleString()}</div>
                                        <div>Size: {formatBytes(stats.estimatedSize)}</div>
                                    </div>
                                </AnimatedCard>
                            ))}
                        </div>
                    </div>

                    {databaseStats.performance.slowQueries.length > 0 && (
                        <div className="slow-queries">
                            <h3>🐌 Slow Queries</h3>
                            <div className="queries-list">
                                {databaseStats.performance.slowQueries.map((query, index) => (
                                    <AnimatedCard key={index} className="query-card">
                                        <div className="query-pattern">{query.query_pattern}</div>
                                        <div className="query-stats">
                                            <span>Avg: {query.avg_time.toFixed(2)}ms</span>
                                            <span>Count: {query.count}</span>
                                        </div>
                                    </AnimatedCard>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'errors' && (
                <div className="errors-content">
                    <div className="errors-overview">
                        <h3>🚨 Error Statistics (Last 24h)</h3>
                        <div className="error-stats-grid">
                            {errorStats.map((stat, index) => (
                                <AnimatedCard key={index} className="error-stat-card">
                                    <div className="error-category">{stat.category}</div>
                                    <div className="error-counts">
                                        <div className="error-count">
                                            <span>Total:</span>
                                            <span>{stat.count}</span>
                                        </div>
                                        <div className="error-count">
                                            <span>Resolved:</span>
                                            <span>{stat.resolved_count}</span>
                                        </div>
                                        <div className="error-count">
                                            <span>Severity:</span>
                                            <span className={`severity-${stat.severity}`}>
                                                {stat.severity}
                                            </span>
                                        </div>
                                    </div>
                                    <AnimatedProgress 
                                        progress={(stat.resolved_count / stat.count) * 100}
                                        color="#00ff88"
                                        showPercentage={true}
                                    />
                                </AnimatedCard>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'twitter' && twitterStatus && (
                <div className="twitter-content">
                    <AnimatedCard>
                        <h3>🐦 Twitter Integration Status</h3>
                        <div className="twitter-status">
                            <div className="status-indicator">
                                <span 
                                    className={`status-dot ${twitterStatus.connected ? 'connected' : 'disconnected'}`}
                                ></span>
                                <span>{twitterStatus.connected ? 'Connected' : 'Disconnected'}</span>
                            </div>
                            
                            {twitterStatus.connected && twitterStatus.user && (
                                <div className="twitter-account-info">
                                    <div className="account-detail">
                                        <span>Username:</span>
                                        <span>@{twitterStatus.user.username}</span>
                                    </div>
                                    <div className="account-detail">
                                        <span>Display Name:</span>
                                        <span>{twitterStatus.user.name}</span>
                                    </div>
                                    <div className="account-detail">
                                        <span>Followers:</span>
                                        <span>{twitterStatus.user.public_metrics?.followers_count?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="account-detail">
                                        <span>Following:</span>
                                        <span>{twitterStatus.user.public_metrics?.following_count?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                            )}
                            
                            {twitterStatus.rateLimits && (
                                <div className="rate-limits">
                                    <h4>Rate Limits</h4>
                                    {Object.entries(twitterStatus.rateLimits).map(([endpoint, limits]: [string, any]) => (
                                        <div key={endpoint} className="rate-limit">
                                            <span>{endpoint}:</span>
                                            <AnimatedProgress 
                                                progress={limits.percentage}
                                                color={limits.percentage > 50 ? '#00ff88' : limits.percentage > 20 ? '#ffaa00' : '#ff4444'}
                                                showPercentage={true}
                                            />
                                            <span>{limits.remaining}/{limits.limit}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!twitterStatus.connected && twitterStatus.error && (
                                <div className="error-message">
                                    <span>Error: {twitterStatus.error}</span>
                                </div>
                            )}
                        </div>
                    </AnimatedCard>
                </div>
            )}
        </div>
    );
};

export default SystemDashboard;
