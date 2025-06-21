import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { AnimatedCard, AnimatedButton, AnimatedProgress } from './AnimationProvider';
import LoadingSpinner from './LoadingSpinner';

interface AdvancedCacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    hitRate: number;
    memoryUsage: number;
    memorySize: number;
    maxMemorySize: number;
    entriesInMemory: number;
}

interface CDNReport {
    totalAssets: number;
    optimizedAssets: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    compressionSavings: {
        gzip: {
            assets: number;
            originalSize: number;
            compressedSize: number;
            savingsPercent: string;
        };
        brotli: {
            assets: number;
            originalSize: number;
            compressedSize: number;
            savingsPercent: string;
        };
    };
    assetTypes: Record<string, { count: number; size: number }>;
}

interface PerformanceDashboardData {
    advanced_cache_statistics: AdvancedCacheStats;
    cdn_optimization_report: CDNReport;
    system_statistics: any;
    optimization_suggestions: any[];
}

const PerformanceDashboard: React.FC = () => {
    const [data, setData] = useState<PerformanceDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'cache' | 'cdn' | 'optimization'>('overview');

    useEffect(() => {
        loadPerformanceData();
        const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const loadPerformanceData = async () => {
        try {
            const response = await ApiService.get('/api/performance/dashboard');
            setData(response);
        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const invalidateCache = async (tags: string[]) => {
        try {
            await ApiService.post('/api/cache/invalidate', { tags });
            alert(`✅ Cache invalidated for tags: ${tags.join(', ')}`);
            loadPerformanceData();
        } catch (error) {
            console.error('Error invalidating cache:', error);
            alert('❌ Failed to invalidate cache');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.warning) return 'warning';
        return 'error';
    };

    if (loading) {
        return (
            <div className="performance-dashboard">
                <LoadingSpinner text="Loading performance dashboard..." />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="performance-dashboard">
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
        <div className="performance-dashboard">
            <div className="dashboard-header">
                <h2>⚡ Performance Dashboard</h2>
                <p>Advanced caching, CDN optimization, and system performance metrics</p>
                <AnimatedButton onClick={loadPerformanceData} variant="secondary">
                    🔄 Refresh Data
                </AnimatedButton>
            </div>

            {/* Tab Navigation */}
            <div className="performance-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Overview
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'cache' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cache')}
                >
                    💾 Advanced Cache
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'cdn' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cdn')}
                >
                    🌐 CDN Optimization
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'optimization' ? 'active' : ''}`}
                    onClick={() => setActiveTab('optimization')}
                >
                    🚀 Optimization
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="overview-content">
                    <div className="metrics-grid">
                        <AnimatedCard className="metric-card">
                            <h3>💾 Cache Performance</h3>
                            <div className="metric-value">
                                {data.advanced_cache_statistics.hitRate.toFixed(1)}%
                            </div>
                            <div className="metric-label">Hit Rate</div>
                            <AnimatedProgress 
                                progress={data.advanced_cache_statistics.hitRate}
                                color={getPerformanceStatus(data.advanced_cache_statistics.hitRate, { good: 80, warning: 60 }) === 'good' ? '#00ff88' : '#ffaa00'}
                            />
                        </AnimatedCard>

                        <AnimatedCard className="metric-card">
                            <h3>🗄️ Memory Usage</h3>
                            <div className="metric-value">
                                {data.advanced_cache_statistics.memoryUsage.toFixed(1)}%
                            </div>
                            <div className="metric-label">
                                {formatBytes(data.advanced_cache_statistics.memorySize)} / {formatBytes(data.advanced_cache_statistics.maxMemorySize)}
                            </div>
                            <AnimatedProgress 
                                progress={data.advanced_cache_statistics.memoryUsage}
                                color={getPerformanceStatus(100 - data.advanced_cache_statistics.memoryUsage, { good: 50, warning: 20 }) === 'good' ? '#00ff88' : '#ff4444'}
                            />
                        </AnimatedCard>

                        <AnimatedCard className="metric-card">
                            <h3>📦 CDN Assets</h3>
                            <div className="metric-value">
                                {data.cdn_optimization_report.optimizedAssets}
                            </div>
                            <div className="metric-label">
                                of {data.cdn_optimization_report.totalAssets} optimized
                            </div>
                            <AnimatedProgress 
                                progress={(data.cdn_optimization_report.optimizedAssets / data.cdn_optimization_report.totalAssets) * 100}
                                color="#4a90e2"
                            />
                        </AnimatedCard>

                        <AnimatedCard className="metric-card">
                            <h3>🗜️ Compression Savings</h3>
                            <div className="metric-value">
                                {data.cdn_optimization_report.compressionSavings.brotli.savingsPercent || '0'}%
                            </div>
                            <div className="metric-label">Brotli Compression</div>
                            <div className="compression-details">
                                <small>Gzip: {data.cdn_optimization_report.compressionSavings.gzip.savingsPercent || '0'}%</small>
                            </div>
                        </AnimatedCard>
                    </div>
                </div>
            )}

            {/* Cache Tab */}
            {activeTab === 'cache' && (
                <div className="cache-content">
                    <div className="cache-stats-grid">
                        <AnimatedCard className="cache-stat-card">
                            <h3>📈 Cache Operations</h3>
                            <div className="cache-operations">
                                <div className="operation">
                                    <span>Hits:</span>
                                    <span className="value hits">{data.advanced_cache_statistics.hits.toLocaleString()}</span>
                                </div>
                                <div className="operation">
                                    <span>Misses:</span>
                                    <span className="value misses">{data.advanced_cache_statistics.misses.toLocaleString()}</span>
                                </div>
                                <div className="operation">
                                    <span>Sets:</span>
                                    <span className="value sets">{data.advanced_cache_statistics.sets.toLocaleString()}</span>
                                </div>
                                <div className="operation">
                                    <span>Evictions:</span>
                                    <span className="value evictions">{data.advanced_cache_statistics.evictions.toLocaleString()}</span>
                                </div>
                            </div>
                        </AnimatedCard>

                        <AnimatedCard className="cache-stat-card">
                            <h3>💾 Memory Details</h3>
                            <div className="memory-details">
                                <div className="memory-item">
                                    <span>Entries in Memory:</span>
                                    <span>{data.advanced_cache_statistics.entriesInMemory}</span>
                                </div>
                                <div className="memory-item">
                                    <span>Memory Used:</span>
                                    <span>{formatBytes(data.advanced_cache_statistics.memorySize)}</span>
                                </div>
                                <div className="memory-item">
                                    <span>Memory Limit:</span>
                                    <span>{formatBytes(data.advanced_cache_statistics.maxMemorySize)}</span>
                                </div>
                                <div className="memory-item">
                                    <span>Usage:</span>
                                    <span className={`usage ${getPerformanceStatus(100 - data.advanced_cache_statistics.memoryUsage, { good: 50, warning: 20 })}`}>
                                        {data.advanced_cache_statistics.memoryUsage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </AnimatedCard>
                    </div>

                    <AnimatedCard className="cache-actions-card">
                        <h3>🔧 Cache Management</h3>
                        <div className="cache-actions">
                            <AnimatedButton 
                                onClick={() => invalidateCache(['content'])}
                                variant="warning"
                            >
                                🗑️ Clear Content Cache
                            </AnimatedButton>
                            <AnimatedButton 
                                onClick={() => invalidateCache(['analytics'])}
                                variant="warning"
                            >
                                📊 Clear Analytics Cache
                            </AnimatedButton>
                            <AnimatedButton 
                                onClick={() => invalidateCache(['niche'])}
                                variant="warning"
                            >
                                🎯 Clear Niche Cache
                            </AnimatedButton>
                            <AnimatedButton 
                                onClick={() => invalidateCache(['content', 'analytics', 'niche'])}
                                variant="danger"
                            >
                                🧹 Clear All Cache
                            </AnimatedButton>
                        </div>
                    </AnimatedCard>
                </div>
            )}

            {/* CDN Tab */}
            {activeTab === 'cdn' && (
                <div className="cdn-content">
                    <div className="cdn-overview">
                        <AnimatedCard className="cdn-summary-card">
                            <h3>📦 Asset Summary</h3>
                            <div className="asset-summary">
                                <div className="summary-item">
                                    <span>Total Assets:</span>
                                    <span>{data.cdn_optimization_report.totalAssets}</span>
                                </div>
                                <div className="summary-item">
                                    <span>Optimized:</span>
                                    <span>{data.cdn_optimization_report.optimizedAssets}</span>
                                </div>
                                <div className="summary-item">
                                    <span>Original Size:</span>
                                    <span>{formatBytes(data.cdn_optimization_report.totalOriginalSize)}</span>
                                </div>
                            </div>
                        </AnimatedCard>

                        <AnimatedCard className="compression-card">
                            <h3>🗜️ Compression Results</h3>
                            <div className="compression-results">
                                <div className="compression-format">
                                    <h4>Gzip Compression</h4>
                                    <div className="compression-stats">
                                        <span>Assets: {data.cdn_optimization_report.compressionSavings.gzip.assets}</span>
                                        <span>Savings: {data.cdn_optimization_report.compressionSavings.gzip.savingsPercent}%</span>
                                        <span>Size: {formatBytes(data.cdn_optimization_report.compressionSavings.gzip.compressedSize)}</span>
                                    </div>
                                </div>
                                <div className="compression-format">
                                    <h4>Brotli Compression</h4>
                                    <div className="compression-stats">
                                        <span>Assets: {data.cdn_optimization_report.compressionSavings.brotli.assets}</span>
                                        <span>Savings: {data.cdn_optimization_report.compressionSavings.brotli.savingsPercent}%</span>
                                        <span>Size: {formatBytes(data.cdn_optimization_report.compressionSavings.brotli.compressedSize)}</span>
                                    </div>
                                </div>
                            </div>
                        </AnimatedCard>
                    </div>

                    <AnimatedCard className="asset-types-card">
                        <h3>📁 Asset Types</h3>
                        <div className="asset-types">
                            {Object.entries(data.cdn_optimization_report.assetTypes).map(([ext, info]) => (
                                <div key={ext} className="asset-type">
                                    <span className="extension">{ext}</span>
                                    <span className="count">{info.count} files</span>
                                    <span className="size">{formatBytes(info.size)}</span>
                                </div>
                            ))}
                        </div>
                    </AnimatedCard>
                </div>
            )}

            {/* Optimization Tab */}
            {activeTab === 'optimization' && (
                <div className="optimization-content">
                    <AnimatedCard className="optimization-suggestions-card">
                        <h3>💡 Optimization Suggestions</h3>
                        {data.optimization_suggestions.length > 0 ? (
                            <div className="suggestions-list">
                                {data.optimization_suggestions.map((suggestion, index) => (
                                    <div key={index} className="suggestion-item">
                                        <div className="suggestion-header">
                                            <span className="suggestion-type">{suggestion.suggestion_type}</span>
                                            <span className={`priority ${suggestion.impact_level}`}>
                                                {suggestion.impact_level}
                                            </span>
                                        </div>
                                        <div className="suggestion-title">{suggestion.title}</div>
                                        <div className="suggestion-description">{suggestion.description}</div>
                                        {suggestion.expected_improvement && (
                                            <div className="suggestion-improvement">
                                                Expected: {suggestion.expected_improvement}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-suggestions">
                                <p>✨ No optimization suggestions at this time</p>
                                <p>Your application is performing optimally!</p>
                            </div>
                        )}
                    </AnimatedCard>
                </div>
            )}
        </div>
    );
};

export default PerformanceDashboard;
