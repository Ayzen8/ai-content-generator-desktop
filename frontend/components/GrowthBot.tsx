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
    const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);
    const [targetNiches, setTargetNiches] = useState<any[]>([]);
    const [availableNiches, setAvailableNiches] = useState<any[]>([]);

    useEffect(() => {
        loadStats();
        loadNiches();
        loadStoredCredentials();
    }, []);

    const loadStoredCredentials = async () => {
        try {
            const response = await ApiService.get('/api/credentials/x/load');
            if (response.hasCredentials) {
                setHasStoredCredentials(true);
                setCredentials(prev => ({
                    ...prev,
                    apiKey: response.apiKey || '',
                    apiSecret: response.apiSecret || ''
                }));
            }
            setCredentialsLoaded(true);
        } catch (error) {
            console.error('Error loading stored credentials:', error);
            setCredentialsLoaded(true);
        }
    };

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
            // Save credentials first
            await ApiService.post('/api/credentials/x/save', credentials);

            // Then initialize the bot
            await ApiService.post('/api/growth-bot/initialize', credentials);
            setIsInitialized(true);
            setHasStoredCredentials(true);
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

    const clearStoredCredentials = async () => {
        try {
            await ApiService.delete('/api/credentials/x/clear');
            setHasStoredCredentials(false);
            setCredentials({
                apiKey: '',
                apiSecret: '',
                accessToken: '',
                accessSecret: ''
            });
        } catch (error) {
            console.error('Error clearing credentials:', error);
        }
    };

    if (!isInitialized) {
        return (
            <div className="growth-bot-setup">
                <div className="card">
                    <h2>🤖 Growth Bot Setup</h2>
                    <p>Initialize the Growth Bot with your X API credentials to start automated engagement.</p>

                    {hasStoredCredentials && (
                        <div className="stored-credentials-info">
                            <span className="success-icon">✅</span>
                            <span>Stored credentials found! You can use saved credentials or enter new ones.</span>
                            <button
                                onClick={clearStoredCredentials}
                                className="btn btn-sm btn-secondary"
                                style={{ marginLeft: '10px' }}
                            >
                                Clear Saved
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}
                    
                    <div className="credentials-form">
                        <div className="form-group">
                            <label>X API Key</label>
                            <input
                                type="text"
                                value={credentials.apiKey}
                                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="Your X API Key"
                            />
                        </div>

                        <div className="form-group">
                            <label>X API Secret</label>
                            <input
                                type="password"
                                value={credentials.apiSecret}
                                onChange={(e) => setCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                                placeholder="Your X API Secret"
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
                        <h3>📋 How to get X API credentials:</h3>
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
                        <li><strong>Smart Targeting:</strong> Uses hashtags, questions, and problem-solving searches</li>
                        <li><strong>Niche-Specific AI:</strong> Comments using your selected niche personas</li>
                        <li><strong>Question Detection:</strong> Prioritizes engaging with questions for better visibility</li>
                        <li><strong>Quality Filtering:</strong> Avoids viral tweets, targets optimal engagement windows</li>
                        <li><strong>Human-Like Posts:</strong> Occasionally posts organic content (1-3 times/day) to appear authentic</li>
                        <li><strong>Optimal Timing:</strong> Engages during peak hours (9AM-11AM, 1PM-3PM, 7PM-9PM)</li>
                        <li><strong>Safe Limits:</strong> Respects X rate limits (15 follows, 30 likes, 10 comments/hour)</li>
                        <li><strong>Fresh Content Focus:</strong> Engages with recent tweets for maximum impact</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default GrowthBot;
