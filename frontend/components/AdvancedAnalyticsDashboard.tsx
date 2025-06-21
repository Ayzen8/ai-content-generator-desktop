import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface AnalyticsData {
    timeframe: string;
    contentPerformance: any[];
    growthMetrics: any[];
    topPerformingContent: any[];
    nichePerformance: any[];
    growthBotMetrics: any[];
    optimalTimes: any[];
    insights: any[];
}

interface PredictiveData {
    growthTrend: any;
    contentTrend: any;
    engagementTrend: any;
    recommendations: any[];
}

interface PredictiveAnalytics {
    engagement: {
        predicted_value: number;
        confidence_score: number;
        factors: any;
    };
    reach: {
        predicted_value: number;
        confidence_score: number;
        factors: any;
    };
    viral_potential: {
        predicted_value: number;
        confidence_score: number;
        factors: any;
    };
}

interface ContentTrends {
    hashtag_trends: Array<{
        hashtag: string;
        popularity_score: number;
        growth_rate: number;
        usage_count: number;
    }>;
    timing_trends: Array<{
        time_slot: string;
        avg_engagement: number;
        sample_size: number;
    }>;
    format_trends: Array<{
        format: string;
        avg_engagement: number;
        sample_size: number;
    }>;
}

const AdvancedAnalyticsDashboard: React.FC = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [predictiveData, setPredictiveData] = useState<PredictiveData | null>(null);
    const [newPredictiveData, setNewPredictiveData] = useState<PredictiveAnalytics | null>(null);
    const [trendsData, setTrendsData] = useState<ContentTrends | null>(null);
    const [selectedNiche, setSelectedNiche] = useState<number | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('twitter');
    const [niches, setNiches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('30d');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadNiches();
        loadAnalyticsData();
    }, [timeframe]);

    useEffect(() => {
        if (selectedNiche) {
            loadNewPredictiveData();
        }
    }, [selectedNiche, selectedPlatform]);

    const loadNiches = async () => {
        try {
            const nichesData = await ApiService.get('/api/niches');
            setNiches(nichesData);
            if (nichesData.length > 0 && !selectedNiche) {
                setSelectedNiche(nichesData[0].id);
            }
        } catch (error) {
            console.error('Error loading niches:', error);
        }
    };

    const loadAnalyticsData = async () => {
        try {
            setLoading(true);
            const [analytics, predictive] = await Promise.all([
                ApiService.getAdvancedAnalytics(timeframe),
                ApiService.getPredictiveAnalytics()
            ]);

            setAnalyticsData(analytics);
            setPredictiveData(predictive);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadNewPredictiveData = async () => {
        if (!selectedNiche) return;

        try {
            const [predictiveResponse, trendsResponse] = await Promise.all([
                ApiService.get(`/api/analytics/predictive/${selectedNiche}/${selectedPlatform}`).catch(() => null),
                ApiService.get(`/api/analytics/trends?platform=${selectedPlatform}&nicheId=${selectedNiche}`).catch(() => null)
            ]);

            setNewPredictiveData(predictiveResponse);
            setTrendsData(trendsResponse);
        } catch (error) {
            console.error('Error loading new predictive data:', error);
        }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const formatPercentage = (num: number): string => {
        return (num * 100).toFixed(1) + '%';
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return '#00ff88';
        if (confidence >= 0.6) return '#ffaa00';
        return '#ff4444';
    };

    const formatPredictionValue = (type: string, value: number) => {
        switch (type) {
            case 'engagement':
                return `${(value * 100).toFixed(2)}%`;
            case 'reach':
                return value.toLocaleString();
            case 'viral_potential':
                return `${(value * 100).toFixed(1)}%`;
            default:
                return value.toString();
        }
    };

    if (loading) {
        return (
            <div className="analytics-dashboard">
                <div className="dashboard-header">
                    <h2>📊 Advanced Analytics</h2>
                </div>
                <LoadingSpinner text="Loading analytics data..." />
            </div>
        );
    }

    return (
        <div className="analytics-dashboard">
            <div className="dashboard-header">
                <h2>📊 Advanced Analytics</h2>
                <div className="header-controls">
                    <select 
                        value={timeframe} 
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="timeframe-selector"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                    <button onClick={loadAnalyticsData} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="analytics-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    Content Performance
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'growth' ? 'active' : ''}`}
                    onClick={() => setActiveTab('growth')}
                >
                    Growth Analytics
                </button>
                <button
                    className={`tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('predictions')}
                >
                    Predictions
                </button>
                <button
                    className={`tab-btn ${activeTab === 'ai-predictions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai-predictions')}
                >
                    🔮 AI Predictions
                </button>
                <button
                    className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trends')}
                >
                    📈 Trends
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="overview-tab">
                    {/* Key Metrics Cards */}
                    <div className="metrics-grid">
                        {analyticsData?.contentPerformance?.map((platform, index) => (
                            <div key={index} className="metric-card">
                                <div className="metric-header">
                                    <h3>{platform.platform}</h3>
                                    <span className="metric-icon">📱</span>
                                </div>
                                <div className="metric-value">
                                    {formatPercentage(platform.avg_engagement_rate)}
                                </div>
                                <div className="metric-label">Avg Engagement Rate</div>
                                <div className="metric-details">
                                    <span>{formatNumber(platform.total_likes)} likes</span>
                                    <span>{formatNumber(platform.total_views)} views</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Insights Section */}
                    {analyticsData?.insights && analyticsData.insights.length > 0 && (
                        <div className="insights-section">
                            <h3>🔍 Key Insights</h3>
                            <div className="insights-grid">
                                {analyticsData.insights.map((insight, index) => (
                                    <div key={index} className={`insight-card priority-${insight.priority}`}>
                                        <div className="insight-header">
                                            <h4>{insight.title}</h4>
                                            <span className={`priority-badge ${insight.priority}`}>
                                                {insight.priority}
                                            </span>
                                        </div>
                                        <p className="insight-message">{insight.message}</p>
                                        <p className="insight-action">{insight.actionable}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Performing Content */}
                    {analyticsData?.topPerformingContent && analyticsData.topPerformingContent.length > 0 && (
                        <div className="top-content-section">
                            <h3>🏆 Top Performing Content</h3>
                            <div className="content-list">
                                {analyticsData.topPerformingContent.slice(0, 5).map((content, index) => (
                                    <div key={index} className="content-item">
                                        <div className="content-rank">#{index + 1}</div>
                                        <div className="content-details">
                                            <h4>{content.title || 'Untitled'}</h4>
                                            <p className="content-preview">
                                                {content.content.substring(0, 100)}...
                                            </p>
                                            <div className="content-meta">
                                                <span className="niche-tag">{content.niche_name}</span>
                                                <span className="platform-tag">{content.platform}</span>
                                            </div>
                                        </div>
                                        <div className="content-metrics">
                                            <div className="metric">
                                                <span className="metric-value">{formatPercentage(content.engagement_rate)}</span>
                                                <span className="metric-label">Engagement</span>
                                            </div>
                                            <div className="metric">
                                                <span className="metric-value">{formatNumber(content.likes)}</span>
                                                <span className="metric-label">Likes</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'content' && (
                <div className="content-tab">
                    {/* Niche Performance */}
                    {analyticsData?.nichePerformance && (
                        <div className="niche-performance-section">
                            <h3>🎯 Niche Performance</h3>
                            <div className="niche-grid">
                                {analyticsData.nichePerformance.map((niche, index) => (
                                    <div key={index} className="niche-card">
                                        <h4>{niche.niche_name}</h4>
                                        <div className="niche-metrics">
                                            <div className="niche-metric">
                                                <span className="value">{niche.total_content}</span>
                                                <span className="label">Posts</span>
                                            </div>
                                            <div className="niche-metric">
                                                <span className="value">{formatPercentage(niche.avg_engagement_rate || 0)}</span>
                                                <span className="label">Avg Engagement</span>
                                            </div>
                                            <div className="niche-metric">
                                                <span className="value">{formatNumber(niche.total_likes || 0)}</span>
                                                <span className="label">Total Likes</span>
                                            </div>
                                        </div>
                                        <div className="engagement-bar">
                                            <div 
                                                className="engagement-fill"
                                                style={{ width: `${(niche.avg_engagement_rate || 0) * 1000}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Optimal Posting Times */}
                    {analyticsData?.optimalTimes && analyticsData.optimalTimes.length > 0 && (
                        <div className="optimal-times-section">
                            <h3>⏰ Optimal Posting Times</h3>
                            <div className="times-grid">
                                {analyticsData.optimalTimes.slice(0, 6).map((time, index) => (
                                    <div key={index} className="time-card">
                                        <h4>{time.niche_name}</h4>
                                        <div className="time-details">
                                            <span className="day">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][time.day_of_week]}</span>
                                            <span className="hour">{time.hour}:00</span>
                                            <span className="platform">{time.platform}</span>
                                        </div>
                                        <div className="engagement-score">
                                            Score: {time.engagement_score.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'growth' && (
                <div className="growth-tab">
                    {/* Growth Bot Metrics */}
                    {analyticsData?.growthBotMetrics && analyticsData.growthBotMetrics.length > 0 && (
                        <div className="growth-bot-section">
                            <h3>🤖 Growth Bot Performance</h3>
                            <div className="growth-metrics-grid">
                                {analyticsData.growthBotMetrics.slice(0, 7).map((metric, index) => (
                                    <div key={index} className="growth-metric-card">
                                        <div className="metric-date">{metric.date}</div>
                                        <div className="metric-stats">
                                            <div className="stat">
                                                <span className="value">{metric.actions_performed}</span>
                                                <span className="label">Actions</span>
                                            </div>
                                            <div className="stat">
                                                <span className="value">{metric.followers_gained}</span>
                                                <span className="label">Followers</span>
                                            </div>
                                            <div className="stat">
                                                <span className="value">{formatPercentage(metric.success_rate)}</span>
                                                <span className="label">Success Rate</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Growth Metrics Chart Placeholder */}
                    <div className="growth-chart-section">
                        <h3>📈 Growth Trend</h3>
                        <div className="chart-placeholder">
                            <p>Growth chart visualization would go here</p>
                            <p>Showing follower growth over time</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'predictions' && predictiveData && (
                <div className="predictions-tab">
                    {/* Growth Predictions */}
                    <div className="predictions-section">
                        <h3>🔮 Growth Predictions</h3>
                        <div className="prediction-cards">
                            <div className="prediction-card">
                                <h4>Follower Growth</h4>
                                <div className="prediction-value">
                                    {predictiveData.growthTrend.prediction} followers
                                </div>
                                <div className="prediction-trend">
                                    Trend: {predictiveData.growthTrend.trend}
                                </div>
                                <div className="prediction-rate">
                                    {predictiveData.growthTrend.growthRate}% growth rate
                                </div>
                            </div>

                            <div className="prediction-card">
                                <h4>Engagement Trend</h4>
                                <div className="prediction-value">
                                    {formatPercentage(predictiveData.engagementTrend.predicted)}
                                </div>
                                <div className="prediction-confidence">
                                    Confidence: {predictiveData.engagementTrend.confidence}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {predictiveData.recommendations && predictiveData.recommendations.length > 0 && (
                        <div className="recommendations-section">
                            <h3>💡 AI Recommendations</h3>
                            <div className="recommendations-list">
                                {predictiveData.recommendations.map((rec, index) => (
                                    <div key={index} className={`recommendation-card priority-${rec.priority}`}>
                                        <div className="rec-header">
                                            <h4>{rec.title}</h4>
                                            <span className={`priority-badge ${rec.priority}`}>
                                                {rec.priority}
                                            </span>
                                        </div>
                                        <p className="rec-description">{rec.description}</p>
                                        <div className="rec-actions">
                                            <h5>Recommended Actions:</h5>
                                            <ul>
                                                {rec.actions.map((action: string, actionIndex: number) => (
                                                    <li key={actionIndex}>{action}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AI Predictions Tab */}
            {activeTab === 'ai-predictions' && (
                <div className="ai-predictions-tab">
                    {/* Niche and Platform Selection */}
                    <div className="prediction-controls">
                        <div className="control-group">
                            <label>Niche:</label>
                            <select
                                value={selectedNiche || ''}
                                onChange={(e) => setSelectedNiche(parseInt(e.target.value))}
                            >
                                {niches.map(niche => (
                                    <option key={niche.id} value={niche.id}>
                                        {niche.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="control-group">
                            <label>Platform:</label>
                            <select
                                value={selectedPlatform}
                                onChange={(e) => setSelectedPlatform(e.target.value)}
                            >
                                <option value="twitter">Twitter/X</option>
                                <option value="instagram">Instagram</option>
                            </select>
                        </div>
                    </div>

                    {newPredictiveData ? (
                        <div className="ai-predictions-grid">
                            {/* Engagement Prediction */}
                            <div className="ai-prediction-card">
                                <div className="prediction-header">
                                    <h3>💬 Engagement Prediction</h3>
                                    <div
                                        className="confidence-badge"
                                        style={{ backgroundColor: getConfidenceColor(newPredictiveData.engagement.confidence_score) }}
                                    >
                                        {Math.round(newPredictiveData.engagement.confidence_score * 100)}% confidence
                                    </div>
                                </div>
                                <div className="prediction-value">
                                    {formatPredictionValue('engagement', newPredictiveData.engagement.predicted_value)}
                                </div>
                                <div className="prediction-factors">
                                    <div className="factor">
                                        <span>Historical Avg:</span>
                                        <span>{formatPredictionValue('engagement', newPredictiveData.engagement.factors.historical_average)}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Trend:</span>
                                        <span className={newPredictiveData.engagement.factors.trend > 0 ? 'positive' : 'negative'}>
                                            {newPredictiveData.engagement.factors.trend > 0 ? '↗️' : '↘️'}
                                            {Math.abs(newPredictiveData.engagement.factors.trend * 100).toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="factor">
                                        <span>Data Points:</span>
                                        <span>{newPredictiveData.engagement.factors.data_points}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reach Prediction */}
                            <div className="ai-prediction-card">
                                <div className="prediction-header">
                                    <h3>👥 Reach Prediction</h3>
                                    <div
                                        className="confidence-badge"
                                        style={{ backgroundColor: getConfidenceColor(newPredictiveData.reach.confidence_score) }}
                                    >
                                        {Math.round(newPredictiveData.reach.confidence_score * 100)}% confidence
                                    </div>
                                </div>
                                <div className="prediction-value">
                                    {formatPredictionValue('reach', newPredictiveData.reach.predicted_value)}
                                </div>
                                <div className="prediction-factors">
                                    <div className="factor">
                                        <span>Historical Avg:</span>
                                        <span>{formatPredictionValue('reach', newPredictiveData.reach.factors.historical_average)}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Trend:</span>
                                        <span className={newPredictiveData.reach.factors.trend > 0 ? 'positive' : 'negative'}>
                                            {newPredictiveData.reach.factors.trend > 0 ? '↗️' : '↘️'}
                                            {Math.abs(newPredictiveData.reach.factors.trend).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="factor">
                                        <span>Data Points:</span>
                                        <span>{newPredictiveData.reach.factors.data_points}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Viral Potential */}
                            <div className="ai-prediction-card">
                                <div className="prediction-header">
                                    <h3>🚀 Viral Potential</h3>
                                    <div
                                        className="confidence-badge"
                                        style={{ backgroundColor: getConfidenceColor(newPredictiveData.viral_potential.confidence_score) }}
                                    >
                                        {Math.round(newPredictiveData.viral_potential.confidence_score * 100)}% confidence
                                    </div>
                                </div>
                                <div className="prediction-value">
                                    {formatPredictionValue('viral_potential', newPredictiveData.viral_potential.predicted_value)}
                                </div>
                                <div className="prediction-factors">
                                    <div className="factor">
                                        <span>Historical Avg:</span>
                                        <span>{formatPredictionValue('viral_potential', newPredictiveData.viral_potential.factors.historical_average)}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Historical Max:</span>
                                        <span>{formatPredictionValue('viral_potential', newPredictiveData.viral_potential.factors.historical_max)}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Data Points:</span>
                                        <span>{newPredictiveData.viral_potential.factors.data_points}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data-message">
                            <p>📊 Insufficient data for AI predictions</p>
                            <p>Generate more content to unlock advanced predictive analytics</p>
                        </div>
                    )}
                </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && trendsData && (
                <div className="trends-tab">
                    {/* Hashtag Trends */}
                    <div className="trends-section">
                        <h3>🏷️ Trending Hashtags</h3>
                        <div className="hashtag-trends">
                            {trendsData.hashtag_trends.slice(0, 10).map((trend, index) => (
                                <div key={index} className="trend-card">
                                    <div className="trend-hashtag">#{trend.hashtag}</div>
                                    <div className="trend-metrics">
                                        <div className="trend-metric">
                                            <span>Growth:</span>
                                            <span className={trend.growth_rate > 0 ? 'positive' : 'negative'}>
                                                {trend.growth_rate > 0 ? '↗️' : '↘️'} {Math.abs(trend.growth_rate).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="trend-metric">
                                            <span>Score:</span>
                                            <span>{trend.popularity_score.toFixed(1)}</span>
                                        </div>
                                        <div className="trend-metric">
                                            <span>Usage:</span>
                                            <span>{trend.usage_count}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timing Trends */}
                    <div className="trends-section">
                        <h3>⏰ Optimal Posting Times</h3>
                        <div className="timing-trends">
                            {trendsData.timing_trends.map((trend, index) => (
                                <div key={index} className="timing-card">
                                    <div className="timing-slot">{trend.time_slot}</div>
                                    <div className="timing-engagement">
                                        Avg Engagement: {(trend.avg_engagement * 100).toFixed(2)}%
                                    </div>
                                    <div className="timing-sample">
                                        Sample: {trend.sample_size} posts
                                    </div>
                                    <div className="engagement-bar">
                                        <div
                                            className="engagement-fill"
                                            style={{ width: `${trend.avg_engagement * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Format Trends */}
                    <div className="trends-section">
                        <h3>📱 Content Format Performance</h3>
                        <div className="format-trends">
                            {trendsData.format_trends.map((trend, index) => (
                                <div key={index} className="format-card">
                                    <div className="format-name">{trend.format.replace('_', ' ').toUpperCase()}</div>
                                    <div className="format-engagement">
                                        Avg Engagement: {(trend.avg_engagement * 100).toFixed(2)}%
                                    </div>
                                    <div className="format-sample">
                                        Sample: {trend.sample_size} posts
                                    </div>
                                    <div className="engagement-bar">
                                        <div
                                            className="engagement-fill"
                                            style={{ width: `${trend.avg_engagement * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedAnalyticsDashboard;
