import React, { useState, useEffect } from 'react';
import Card from './Card';
import NicheList from './NicheList';
import NicheForm from './NicheForm';
import ContentGenerator from './ContentGenerator';
import { ApiService } from '../services/api';
import { LazyLoadErrorBoundary } from '../utils/lazyLoad';
import { usePerformanceTracking } from './PerformanceMonitor';

// Lazy load heavy components for better performance
import {
    LazyAdvancedAnalyticsWithFallback,
    LazySystemDashboardWithFallback,
    LazyCustomNicheCreatorWithFallback
} from './LazyComponents';

// Standard lazy loading for other components
const LazyContentHistory = React.lazy(() => import('./ContentHistory'));
const LazyContentVariations = React.lazy(() => import('./ContentVariations'));
const LazyAnalytics = React.lazy(() => import('./Analytics'));
const LazyContentTemplates = React.lazy(() => import('./ContentTemplates'));
const LazyHashtagResearch = React.lazy(() => import('./HashtagResearch'));
const LazySettings = React.lazy(() => import('./Settings'));
const LazyGrowthBot = React.lazy(() => import('./GrowthBot'));

interface DashboardStats {
  totalContent: number;
  pendingContent: number;
  postedContent: number;
  totalNiches: number;
}

// SSE setup for real-time updates
const setupSSE = (onMessage: (data: any) => void) => {
    const baseUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : window.location.origin;
    const eventSource = new EventSource(`${baseUrl}/api/events`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
    };

    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
    };

    return () => {
        eventSource.close();
    };
};

const Dashboard: React.FC = () => {
    const [serviceStatus, setServiceStatus] = useState<'running' | 'stopped'>('stopped');
    const [notifications, setNotifications] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'variations' | 'history' | 'templates' | 'hashtags' | 'analytics' | 'advanced-analytics' | 'niches' | 'system' | 'growth-bot' | 'settings' | 'custom-niche'>('overview');
    const [stats, setStats] = useState<DashboardStats>({
        totalContent: 0,
        pendingContent: 0,
        postedContent: 0,
        totalNiches: 0
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [showCustomNicheCreator, setShowCustomNicheCreator] = useState(false);

    // Performance tracking for the Dashboard component
    const { trackApiCall } = usePerformanceTracking('Dashboard');

    useEffect(() => {
        loadStats();
        // Only set up SSE in development (localhost)
        if (window.location.hostname === 'localhost') {
            const cleanup = setupSSE((data) => {
                if (data.type === 'status') {
                    setServiceStatus(data.status);
                } else if (data.type === 'notification') {
                    setNotifications(prev => Array.isArray(prev) ? [data.message, ...prev].slice(0, 5) : [data.message]);
                } else if (data.type === 'stats') {
                    setStats(data.stats);
                }
            });

            return cleanup;
        }
    }, [refreshKey]);

    const loadStats = async () => {
        try {
            const [contentStats, nicheStats] = await Promise.all([
                trackApiCall(ApiService.get('/api/content/stats'), '/api/content/stats'),
                trackApiCall(ApiService.get('/api/niches/stats'), '/api/niches/stats')
            ]);

            setStats({
                totalContent: contentStats.total || 0,
                pendingContent: contentStats.pending || 0,
                postedContent: contentStats.posted || 0,
                totalNiches: nicheStats.total || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleNicheCreated = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🤖 AI Content Generator</h1>
                <div className={`status-indicator ${serviceStatus}`}>
                    Service: {serviceStatus}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <span className="tab-icon">📊</span>
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    <span className="tab-icon">🤖</span>
                    Content Generator
                </button>

                <button
                    className={`tab-btn ${activeTab === 'variations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('variations')}
                >
                    <span className="tab-icon">🎨</span>
                    Content Variations
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <span className="tab-icon">📚</span>
                    Content History
                </button>
                <button
                    className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    <span className="tab-icon">📝</span>
                    Templates
                </button>
                <button
                    className={`tab-btn ${activeTab === 'hashtags' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hashtags')}
                >
                    <span className="tab-icon">🔍</span>
                    Hashtags
                </button>
                <button
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    <span className="tab-icon">📊</span>
                    Analytics
                </button>
                <button
                    className={`tab-btn ${activeTab === 'advanced-analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('advanced-analytics')}
                >
                    <span className="tab-icon">📈</span>
                    Advanced Analytics
                </button>
                <button
                    className={`tab-btn ${activeTab === 'niches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('niches')}
                >
                    <span className="tab-icon">🎯</span>
                    Niche Management
                </button>
                <button
                    className={`tab-btn ${activeTab === 'custom-niche' ? 'active' : ''}`}
                    onClick={() => setActiveTab('custom-niche')}
                >
                    <span className="tab-icon">✨</span>
                    Custom Niche
                </button>
                <button
                    className={`tab-btn ${activeTab === 'growth-bot' ? 'active' : ''}`}
                    onClick={() => setActiveTab('growth-bot')}
                >
                    <span className="tab-icon">🤖</span>
                    Growth Bot
                </button>
                <button
                    className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    <span className="tab-icon">🔧</span>
                    System
                </button>
                <button
                    className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <span className="tab-icon">⚙️</span>
                    Settings
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="dashboard-grid">
                        <Card title="Quick Stats" className="stats-card">
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <label>Total Niches</label>
                                    <span>{stats.totalNiches}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Total Content</label>
                                    <span>{stats.totalContent}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Pending</label>
                                    <span>{stats.pendingContent}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Posted</label>
                                    <span>{stats.postedContent}</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="Recent Notifications" className="notifications-card">
                            <ul className="notification-list">
                                {Array.isArray(notifications) && notifications.map((notification, index) => (
                                    <li key={index} className="notification-item">
                                        {notification}
                                    </li>
                                ))}
                                {(!notifications || notifications.length === 0) && (
                                    <li className="notification-item empty">
                                        No recent notifications
                                    </li>
                                )}
                            </ul>
                        </Card>

                        <Card title="Quick Actions" className="actions-card">
                            <div className="quick-actions">
                                <button
                                    className="action-btn primary"
                                    onClick={() => setActiveTab('content')}
                                >
                                    ✨ Generate Content
                                </button>
                                <button
                                    className="action-btn secondary"
                                    onClick={() => setActiveTab('niches')}
                                >
                                    🎯 Manage Niches
                                </button>
                                <button
                                    className="action-btn tertiary"
                                    onClick={() => setActiveTab('settings')}
                                >
                                    ⚙️ Settings
                                </button>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'content' && (
                    <ContentGenerator />
                )}

                {activeTab === 'variations' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Content Variations...</div>}>
                            <LazyContentVariations />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'history' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Content History...</div>}>
                            <LazyContentHistory />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'templates' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Templates...</div>}>
                            <LazyContentTemplates />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'hashtags' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Hashtag Research...</div>}>
                            <LazyHashtagResearch />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'analytics' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Analytics...</div>}>
                            <LazyAnalytics />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'advanced-analytics' && (
                    <LazyLoadErrorBoundary>
                        <LazyAdvancedAnalyticsWithFallback />
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'niches' && (
                    <div className="niche-management">
                        <NicheForm onNicheCreated={handleNicheCreated} />
                        <NicheList key={refreshKey} />
                    </div>
                )}

                {activeTab === 'custom-niche' && (
                    <LazyLoadErrorBoundary>
                        <LazyCustomNicheCreatorWithFallback
                            onNicheCreated={handleNicheCreated}
                            onClose={() => setActiveTab('niches')}
                        />
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'system' && (
                    <LazyLoadErrorBoundary>
                        <LazySystemDashboardWithFallback />
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'growth-bot' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Growth Bot...</div>}>
                            <LazyGrowthBot />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}

                {activeTab === 'settings' && (
                    <LazyLoadErrorBoundary>
                        <React.Suspense fallback={<div className="loading-fallback">Loading Settings...</div>}>
                            <LazySettings />
                        </React.Suspense>
                    </LazyLoadErrorBoundary>
                )}
            </div>
        </div>
    );
};

export default Dashboard;