import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface GrowthBotStats {
    isRunning: boolean;
    followsToday: number;
    likesToday: number;
    commentsToday: number;
    retweetsToday: number;
    followersGained: number;
    config: {
        maxFollowsPerHour: number;
        maxLikesPerHour: number;
        maxCommentsPerHour: number;
        targetNiches: any[];
    };
}

const GrowthBot: React.FC = () => {
    const [stats, setStats] = useState<GrowthBotStats | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState({
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        accessSecret: ''
    });
    const [targetNiches, setTargetNiches] = useState<any[]>([]);
    const [availableNiches, setAvailableNiches] = useState<any[]>([]);

    useEffect(() => {
        loadStats();
        loadNiches();
    }, []);

    const loadStats = async () => {
        try {
            const response = await ApiService.get('/api/growth-bot/stats');
            setStats(response);
            setIsInitialized(true);
        } catch (error) {
            console.error('Failed to load growth bot stats:', error);
        }
    };

    const loadNiches = async () => {
        try {
            const response = await ApiService.get('/api/niches');
            setAvailableNiches(response);
        } catch (error) {
            console.error('Failed to load niches:', error);
        }
    };

    const initializeBot = async () => {
        setLoading(true);
        setError(null);
        
        try {
            await ApiService.post('/api/growth-bot/initialize', credentials);
            setIsInitialized(true);
            await loadStats();
        } catch (error: any) {
            setError(error.message || 'Failed to initialize Growth Bot');
        } finally {
            setLoading(false);
        }
    };

    const startBot = async () => {
        setLoading(true);
        setError(null);
        
        try {
            await ApiService.post('/api/growth-bot/start', { targetNiches });
            await loadStats();
        } catch (error: any) {
            setError(error.message || 'Failed to start Growth Bot');
        } finally {
            setLoading(false);
        }
    };

    const stopBot = async () => {
        setLoading(true);
        
        try {
            await ApiService.post('/api/growth-bot/stop', {});
            await loadStats();
        } catch (error: any) {
            setError(error.message || 'Failed to stop Growth Bot');
        } finally {
            setLoading(false);
        }
    };

    const handleNicheToggle = (niche: any) => {
        setTargetNiches(prev => {
            const exists = prev.find(n => n.id === niche.id);
            if (exists) {
                return prev.filter(n => n.id !== niche.id);
            } else {
                return [...prev, niche];
            }
        });
    };

    if (!isInitialized) {
        return (
            <div className="growth-bot-setup">
                <div className="card">
                    <h2>🤖 Growth Bot Setup</h2>
                    <p>Initialize the Growth Bot with your Twitter API credentials to start automated engagement.</p>
                    
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}
                    
                    <div className="credentials-form">
                        <div className="form-group">
                            <label>Twitter API Key</label>
                            <input
                                type="text"
                                value={credentials.apiKey}
                                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="Your Twitter API Key"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Twitter API Secret</label>
                            <input
                                type="password"
                                value={credentials.apiSecret}
                                onChange={(e) => setCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                                placeholder="Your Twitter API Secret"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Access Token</label>
                            <input
                                type="text"
                                value={credentials.accessToken}
                                onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
                                placeholder="Your Access Token"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Access Token Secret</label>
                            <input
                                type="password"
                                value={credentials.accessSecret}
                                onChange={(e) => setCredentials(prev => ({ ...prev, accessSecret: e.target.value }))}
                                placeholder="Your Access Token Secret"
                            />
                        </div>
                        
                        <button 
                            onClick={initializeBot} 
                            disabled={loading || !credentials.apiKey || !credentials.apiSecret}
                            className="btn btn-primary"
                        >
                            {loading ? '🔄 Initializing...' : '🚀 Initialize Growth Bot'}
                        </button>
                    </div>
                    
                    <div className="setup-help">
                        <h3>📋 How to get Twitter API credentials:</h3>
                        <ol>
                            <li>Go to <a href="https://developer.twitter.com" target="_blank">developer.twitter.com</a></li>
                            <li>Create a new app or use existing one</li>
                            <li>Generate API keys and access tokens</li>
                            <li>Copy the credentials above</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="growth-bot-dashboard">
            <div className="growth-bot-header">
                <h2>🤖 Growth Bot Dashboard</h2>
                <div className="bot-status">
                    <span className={`status-indicator ${stats?.isRunning ? 'running' : 'stopped'}`}>
                        {stats?.isRunning ? '🟢 Running' : '🔴 Stopped'}
                    </span>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            <div className="growth-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.followsToday || 0}</div>
                        <div className="stat-label">Follows Today</div>
                        <div className="stat-limit">/ {stats?.config.maxFollowsPerHour || 15}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">❤️</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.likesToday || 0}</div>
                        <div className="stat-label">Likes Today</div>
                        <div className="stat-limit">/ {stats?.config.maxLikesPerHour || 30}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💬</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.commentsToday || 0}</div>
                        <div className="stat-label">Comments Today</div>
                        <div className="stat-limit">/ {stats?.config.maxCommentsPerHour || 10}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.followersGained || 0}</div>
                        <div className="stat-label">Followers Gained</div>
                        <div className="stat-limit">This Week</div>
                    </div>
                </div>
            </div>

            <div className="growth-controls">
                <div className="card">
                    <h3>🎯 Target Niches</h3>
                    <p>Select niches for the bot to target for engagement:</p>
                    
                    <div className="niche-selector">
                        {availableNiches.map(niche => (
                            <label key={niche.id} className="niche-checkbox">
                                <input
                                    type="checkbox"
                                    checked={targetNiches.some(n => n.id === niche.id)}
                                    onChange={() => handleNicheToggle(niche)}
                                />
                                <span className="niche-name">{niche.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="bot-actions">
                    {!stats?.isRunning ? (
                        <button 
                            onClick={startBot} 
                            disabled={loading || targetNiches.length === 0}
                            className="btn btn-success"
                        >
                            {loading ? '🔄 Starting...' : '🚀 Start Growth Bot'}
                        </button>
                    ) : (
                        <button 
                            onClick={stopBot} 
                            disabled={loading}
                            className="btn btn-danger"
                        >
                            {loading ? '🔄 Stopping...' : '⏹️ Stop Growth Bot'}
                        </button>
                    )}
                </div>
            </div>

            <div className="growth-info">
                <div className="card">
                    <h3>ℹ️ How Growth Bot Works</h3>
                    <ul>
                        <li><strong>Smart Targeting:</strong> Finds users in your selected niches</li>
                        <li><strong>AI Comments:</strong> Generates helpful, engaging comments</li>
                        <li><strong>Safe Limits:</strong> Respects Twitter rate limits and best practices</li>
                        <li><strong>Quality Focus:</strong> Only engages with relevant, quality content</li>
                        <li><strong>Analytics:</strong> Tracks performance and growth metrics</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default GrowthBot;
