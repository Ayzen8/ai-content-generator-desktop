import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface PerformanceMetrics {
    totalContent: number;
    avgEngagementRate: number;
    topPerformingNiche: string;
    contentByPlatform: {
        twitter: number;
        instagram: number;
        total: number;
    };
    engagementTrends: {
        date: string;
        engagement: number;
        reach: number;
    }[];
    topContent: {
        id: string;
        content: string;
        niche: string;
        platform: string;
        engagement: number;
        created_at: string;
    }[];
}

const PerformanceAnalytics: React.FC = () => {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'twitter' | 'instagram'>('all');

    useEffect(() => {
        loadPerformanceMetrics();
    }, [timeRange, selectedPlatform]);

    const loadPerformanceMetrics = async () => {
        setLoading(true);
        try {
            const response = await ApiService.get(`/api/analytics/performance?timeRange=${timeRange}&platform=${selectedPlatform}`);
            setMetrics(response);
        } catch (error) {
            console.error('Failed to load performance metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatEngagementRate = (rate: number) => {
        return `${(rate * 100).toFixed(1)}%`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (loading) {
        return (
            <div className="performance-analytics loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading performance analytics...</p>
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="performance-analytics error">
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <p>Failed to load performance metrics. Please try again.</p>
                    <button onClick={loadPerformanceMetrics} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="performance-analytics">
            <div className="analytics-header">
                <h2>📊 Performance Analytics</h2>
                <div className="analytics-controls">
                    <div className="time-range-selector">
                        <label>Time Range:</label>
                        <select 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="time-range-select"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="1y">Last year</option>
                        </select>
                    </div>
                    <div className="platform-selector">
                        <label>Platform:</label>
                        <select 
                            value={selectedPlatform} 
                            onChange={(e) => setSelectedPlatform(e.target.value as any)}
                            className="platform-select"
                        >
                            <option value="all">All Platforms</option>
                            <option value="twitter">Twitter/X</option>
                            <option value="instagram">Instagram</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="metrics-overview">
                <div className="metric-card">
                    <div className="metric-icon">📝</div>
                    <div className="metric-content">
                        <div className="metric-value">{metrics.totalContent}</div>
                        <div className="metric-label">Total Content</div>
                        <div className="metric-change">+12% vs last period</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-content">
                        <div className="metric-value">{formatEngagementRate(metrics.avgEngagementRate)}</div>
                        <div className="metric-label">Avg Engagement Rate</div>
                        <div className="metric-change">+5.2% vs last period</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">🎯</div>
                    <div className="metric-content">
                        <div className="metric-value">{metrics.topPerformingNiche}</div>
                        <div className="metric-label">Top Performing Niche</div>
                        <div className="metric-change">Best engagement</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">📱</div>
                    <div className="metric-content">
                        <div className="metric-value">{metrics.contentByPlatform.total}</div>
                        <div className="metric-label">Multi-Platform Posts</div>
                        <div className="metric-change">
                            {metrics.contentByPlatform.twitter}🐦 {metrics.contentByPlatform.instagram}📸
                        </div>
                    </div>
                </div>
            </div>

            <div className="analytics-charts">
                <div className="chart-container">
                    <h3>📈 Engagement Trends</h3>
                    <div className="engagement-chart">
                        {metrics.engagementTrends.map((trend, index) => (
                            <div key={index} className="trend-bar">
                                <div 
                                    className="trend-fill"
                                    style={{ 
                                        height: `${(trend.engagement / Math.max(...metrics.engagementTrends.map(t => t.engagement))) * 100}%` 
                                    }}
                                ></div>
                                <div className="trend-label">{new Date(trend.date).toLocaleDateString()}</div>
                                <div className="trend-value">{formatNumber(trend.engagement)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-container">
                    <h3>🏆 Top Performing Content</h3>
                    <div className="top-content-list">
                        {metrics.topContent.map((content, index) => (
                            <div key={content.id} className="content-item">
                                <div className="content-rank">#{index + 1}</div>
                                <div className="content-details">
                                    <div className="content-text">
                                        {content.content.substring(0, 80)}...
                                    </div>
                                    <div className="content-meta">
                                        <span className="content-niche">{content.niche}</span>
                                        <span className="content-platform">{content.platform}</span>
                                        <span className="content-date">
                                            {new Date(content.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="content-engagement">
                                    <div className="engagement-value">{formatNumber(content.engagement)}</div>
                                    <div className="engagement-label">engagements</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="analytics-insights">
                <div className="insight-card">
                    <h3>💡 Key Insights</h3>
                    <ul className="insights-list">
                        <li>
                            <strong>Best performing time:</strong> Content posted between 2-4 PM gets 23% more engagement
                        </li>
                        <li>
                            <strong>Top niche:</strong> {metrics.topPerformingNiche} content consistently outperforms others
                        </li>
                        <li>
                            <strong>Platform preference:</strong> Twitter posts get faster engagement, Instagram has higher reach
                        </li>
                        <li>
                            <strong>Content length:</strong> Posts between 100-150 characters perform best on Twitter
                        </li>
                    </ul>
                </div>

                <div className="insight-card">
                    <h3>🎯 Recommendations</h3>
                    <ul className="recommendations-list">
                        <li>Focus more content creation on {metrics.topPerformingNiche} niche</li>
                        <li>Schedule posts during peak engagement hours (2-4 PM)</li>
                        <li>Experiment with shorter, punchier content for Twitter</li>
                        <li>Use more visual elements for Instagram posts</li>
                        <li>Cross-promote high-performing content across platforms</li>
                    </ul>
                </div>
            </div>

            <div className="analytics-actions">
                <button className="btn btn-primary">
                    📊 Export Report
                </button>
                <button className="btn btn-secondary">
                    📧 Schedule Report
                </button>
                <button className="btn btn-secondary">
                    🔄 Refresh Data
                </button>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
