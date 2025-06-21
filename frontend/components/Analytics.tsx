import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface AnalyticsOverview {
  totalContent: number;
  totalNiches: number;
  contentByStatus: Array<{ status: string; count: number }>;
  contentByNiche: Array<{ name: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  topEvents: Array<{ event_type: string; count: number }>;
}

interface PerformanceData {
  generationTimes: {
    avg_seconds: number;
    min_seconds: number;
    max_seconds: number;
  };
  successRate: Array<{ status: string; count: number; percentage: number }>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
}

const Analytics: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [timeframe, setTimeframe] = useState<string>('7d');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'insights'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewData, performanceData] = await Promise.all([
        ApiService.get(`/api/analytics/overview?timeframe=${timeframe}`),
        ApiService.get(`/api/analytics/performance?timeframe=${timeframe}`)
      ]);

      setOverview(overviewData.overview);
      setPerformance(performanceData.performance);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      default: return 'Last 7 Days';
    }
  };

  const renderOverviewTab = () => (
    <div className="analytics-overview">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <div className="metric-value">{overview?.totalContent || 0}</div>
            <div className="metric-label">Content Generated</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <div className="metric-value">{overview?.totalNiches || 0}</div>
            <div className="metric-label">Active Niches</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">
              {overview?.contentByStatus?.find(s => s.status === 'posted')?.count || 0}
            </div>
            <div className="metric-label">Posted Content</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">⏳</div>
          <div className="metric-content">
            <div className="metric-value">
              {overview?.contentByStatus?.find(s => s.status === 'pending')?.count || 0}
            </div>
            <div className="metric-label">Pending Content</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Content by Status */}
        <div className="chart-card">
          <h3>📈 Content by Status</h3>
          <div className="status-chart">
            {overview?.contentByStatus?.map(item => (
              <div key={item.status} className="status-bar">
                <div className="status-label">{item.status}</div>
                <div className="status-progress">
                  <div 
                    className={`status-fill ${item.status}`}
                    style={{ 
                      width: `${(item.count / (overview.totalContent || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="status-count">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Niches */}
        <div className="chart-card">
          <h3>🏆 Top Performing Niches</h3>
          <div className="niche-chart">
            {overview?.contentByNiche?.slice(0, 8).map((item, index) => (
              <div key={item.name} className="niche-bar">
                <div className="niche-rank">#{index + 1}</div>
                <div className="niche-name">{item.name}</div>
                <div className="niche-progress">
                  <div 
                    className="niche-fill"
                    style={{ 
                      width: `${(item.count / (overview.contentByNiche[0]?.count || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="niche-count">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity */}
        <div className="chart-card full-width">
          <h3>📅 Daily Activity</h3>
          <div className="activity-chart">
            {overview?.dailyActivity?.map(item => (
              <div key={item.date} className="activity-day">
                <div 
                  className="activity-bar"
                  style={{ 
                    height: `${(item.count / Math.max(...(overview.dailyActivity?.map(d => d.count) || [1]))) * 100}%` 
                  }}
                  title={`${item.date}: ${item.count} items`}
                ></div>
                <div className="activity-date">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="analytics-performance">
      {/* Performance Metrics */}
      <div className="performance-grid">
        <div className="perf-card">
          <div className="perf-icon">⚡</div>
          <div className="perf-content">
            <div className="perf-value">
              {formatDuration(performance?.generationTimes?.avg_seconds || 0)}
            </div>
            <div className="perf-label">Avg Generation Time</div>
          </div>
        </div>
        
        <div className="perf-card">
          <div className="perf-icon">🚀</div>
          <div className="perf-content">
            <div className="perf-value">
              {formatDuration(performance?.generationTimes?.min_seconds || 0)}
            </div>
            <div className="perf-label">Fastest Generation</div>
          </div>
        </div>
        
        <div className="perf-card">
          <div className="perf-icon">🐌</div>
          <div className="perf-content">
            <div className="perf-value">
              {formatDuration(performance?.generationTimes?.max_seconds || 0)}
            </div>
            <div className="perf-label">Slowest Generation</div>
          </div>
        </div>
        
        <div className="perf-card">
          <div className="perf-icon">✅</div>
          <div className="perf-content">
            <div className="perf-value">
              {performance?.successRate?.find(s => s.status === 'completed')?.percentage || 0}%
            </div>
            <div className="perf-label">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Success Rate Chart */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>📊 Success Rate Breakdown</h3>
          <div className="success-chart">
            {performance?.successRate?.map(item => (
              <div key={item.status} className="success-item">
                <div className={`success-indicator ${item.status}`}></div>
                <div className="success-details">
                  <div className="success-status">{item.status}</div>
                  <div className="success-stats">
                    {item.count} items ({item.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="chart-card">
          <h3>🕐 Usage by Hour</h3>
          <div className="hourly-chart">
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i.toString().padStart(2, '0');
              const data = performance?.hourlyDistribution?.find(h => h.hour === hour);
              const count = data?.count || 0;
              const maxCount = Math.max(...(performance?.hourlyDistribution?.map(h => h.count) || [1]));
              
              return (
                <div key={hour} className="hour-bar">
                  <div 
                    className="hour-fill"
                    style={{ height: `${(count / maxCount) * 100}%` }}
                    title={`${hour}:00 - ${count} items`}
                  ></div>
                  <div className="hour-label">{hour}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="analytics-insights">
      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-icon">🎯</div>
          <div className="insight-content">
            <h4>Most Popular Niche</h4>
            <p>{overview?.contentByNiche?.[0]?.name || 'No data'}</p>
            <small>{overview?.contentByNiche?.[0]?.count || 0} pieces generated</small>
          </div>
        </div>
        
        <div className="insight-card">
          <div className="insight-icon">📈</div>
          <div className="insight-content">
            <h4>Peak Activity</h4>
            <p>
              {performance?.hourlyDistribution?.reduce((max, curr) => 
                curr.count > max.count ? curr : max, { hour: '00', count: 0 }
              )?.hour || '00'}:00
            </p>
            <small>Most active hour of the day</small>
          </div>
        </div>
        
        <div className="insight-card">
          <div className="insight-icon">⚡</div>
          <div className="insight-content">
            <h4>Efficiency Score</h4>
            <p>
              {performance?.generationTimes?.avg_seconds ? 
                Math.max(0, 100 - Math.round(performance.generationTimes.avg_seconds / 10)) : 0}%
            </p>
            <small>Based on generation speed</small>
          </div>
        </div>
        
        <div className="insight-card">
          <div className="insight-content">
            <h4>💡 Recommendations</h4>
            <ul>
              <li>Focus on your top-performing niches for better engagement</li>
              <li>Schedule content generation during peak hours</li>
              <li>Consider bulk generation for efficiency</li>
              <li>Review and optimize slow-generating niches</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="header-title">
          <h2>📊 Analytics Dashboard</h2>
          <p>Insights into your content generation performance</p>
        </div>
        
        <div className="header-controls">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="timeframe-select"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          ⚡ Performance
        </button>
        <button
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          💡 Insights
        </button>
      </div>

      {/* Content */}
      <div className="analytics-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'performance' && renderPerformanceTab()}
            {activeTab === 'insights' && renderInsightsTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
