import React, { useState, useEffect } from 'react';
import Card from './Card';
import NicheList from './NicheList';
import NicheForm from './NicheForm';
import ContentGenerator from './ContentGenerator';

// SSE setup for real-time updates
const setupSSE = (onMessage: (data: any) => void) => {
    const eventSource = new EventSource('http://localhost:3000/api/events');
    
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
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'niches'>('overview');
    const [stats, setStats] = useState({
        nichesCount: 0,
        contentGenerated: 0,
        activeJobs: 0
    });

    useEffect(() => {
        // Set up SSE for real-time updates
        const cleanup = setupSSE((data) => {
            if (data.type === 'status') {
                setServiceStatus(data.status);
            } else if (data.type === 'notification') {
                setNotifications(prev => [data.message, ...prev].slice(0, 5));
            } else if (data.type === 'stats') {
                setStats(data.stats);
            }
        });

        return cleanup;
    }, []);

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
                    📊 Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    ✨ Content Generator
                </button>
                <button
                    className={`tab-btn ${activeTab === 'niches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('niches')}
                >
                    🎯 Niche Management
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
                                    <span>{stats.nichesCount}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Content Generated</label>
                                    <span>{stats.contentGenerated}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Active Jobs</label>
                                    <span>{stats.activeJobs}</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="Recent Notifications" className="notifications-card">
                            <ul className="notification-list">
                                {notifications.map((notification, index) => (
                                    <li key={index} className="notification-item">
                                        {notification}
                                    </li>
                                ))}
                                {notifications.length === 0 && (
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
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'content' && (
                    <ContentGenerator />
                )}

                {activeTab === 'niches' && (
                    <div className="niche-management">
                        <NicheForm onNicheCreated={() => {}} />
                        <NicheList />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;