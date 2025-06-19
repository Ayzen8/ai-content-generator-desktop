import React, { useState, useEffect } from 'react';
import Card from './Card';
import NicheList from './NicheList';
import NicheForm from './NicheForm';

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
                <h2>Dashboard</h2>
                <div className={`status-indicator ${serviceStatus}`}>
                    Service: {serviceStatus}
                </div>
            </div>

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
                    </ul>
                </Card>

                <Card title="Niche Management" className="niche-card">
                    <NicheForm onNicheCreated={() => {}} />
                    <NicheList />
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;