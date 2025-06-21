import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface SocialAccount {
    id: string;
    username: string;
    platform: 'twitter' | 'instagram';
    isActive: boolean;
    connected: boolean;
}

interface PostingStats {
    totalPosts: number;
    successfulPosts: number;
    failedPosts: number;
    lastPostTime: string;
}

const SocialMediaIntegration: React.FC = () => {
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [stats, setStats] = useState<PostingStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedContent, setSelectedContent] = useState<any[]>([]);
    const [availableContent, setAvailableContent] = useState<any[]>([]);

    useEffect(() => {
        loadAccounts();
        loadStats();
        loadContent();
    }, []);

    const loadAccounts = async () => {
        try {
            const twitterAccounts = await ApiService.get('/api/twitter/accounts');
            const instagramAccounts = await ApiService.get('/api/instagram/accounts');
            
            const allAccounts = [
                ...twitterAccounts.map((acc: any) => ({ ...acc, platform: 'twitter' as const })),
                ...instagramAccounts.map((acc: any) => ({ ...acc, platform: 'instagram' as const }))
            ];
            
            setAccounts(allAccounts);
        } catch (error) {
            console.error('Failed to load social accounts:', error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await ApiService.get('/api/social/stats');
            setStats(response);
        } catch (error) {
            console.error('Failed to load posting stats:', error);
        }
    };

    const loadContent = async () => {
        try {
            const response = await ApiService.get('/api/content');
            setAvailableContent(response.filter((content: any) => content.status === 'draft'));
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    };

    const connectTwitter = async () => {
        setLoading(true);
        try {
            const authUrl = await ApiService.post('/api/twitter/auth', {});
            window.open(authUrl.url, '_blank', 'width=600,height=600');
            // Poll for connection status
            const checkConnection = setInterval(async () => {
                try {
                    await loadAccounts();
                    clearInterval(checkConnection);
                } catch (error) {
                    // Continue polling
                }
            }, 2000);
        } catch (error: any) {
            setError(error.message || 'Failed to connect Twitter');
        } finally {
            setLoading(false);
        }
    };

    const connectInstagram = async () => {
        setLoading(true);
        try {
            const authUrl = await ApiService.post('/api/instagram/auth', {});
            window.open(authUrl.url, '_blank', 'width=600,height=600');
            // Poll for connection status
            const checkConnection = setInterval(async () => {
                try {
                    await loadAccounts();
                    clearInterval(checkConnection);
                } catch (error) {
                    // Continue polling
                }
            }, 2000);
        } catch (error: any) {
            setError(error.message || 'Failed to connect Instagram');
        } finally {
            setLoading(false);
        }
    };

    const disconnectAccount = async (accountId: string, platform: string) => {
        try {
            await ApiService.delete(`/api/${platform}/accounts/${accountId}`);
            await loadAccounts();
        } catch (error: any) {
            setError(error.message || 'Failed to disconnect account');
        }
    };

    const postContent = async (contentId: string, platforms: string[]) => {
        setLoading(true);
        setError(null);
        
        try {
            const promises = platforms.map(platform => 
                ApiService.post(`/api/${platform}/post`, { contentId })
            );
            
            await Promise.all(promises);
            await loadStats();
            await loadContent();
            
            setSelectedContent([]);
        } catch (error: any) {
            setError(error.message || 'Failed to post content');
        } finally {
            setLoading(false);
        }
    };

    const scheduleContent = async (contentId: string, platforms: string[], scheduledTime: string) => {
        setLoading(true);
        setError(null);
        
        try {
            await ApiService.post('/api/social/schedule', {
                contentId,
                platforms,
                scheduledTime
            });
            
            await loadContent();
        } catch (error: any) {
            setError(error.message || 'Failed to schedule content');
        } finally {
            setLoading(false);
        }
    };

    const twitterAccounts = accounts.filter(acc => acc.platform === 'twitter');
    const instagramAccounts = accounts.filter(acc => acc.platform === 'instagram');

    return (
        <div className="social-media-integration">
            <div className="integration-header">
                <h2>🔗 Social Media Integration</h2>
                <p>Connect your social media accounts to post content directly from the app.</p>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            <div className="accounts-section">
                <div className="platform-card">
                    <div className="platform-header">
                        <div className="platform-info">
                            <span className="platform-icon">🐦</span>
                            <h3>X & Instagram</h3>
                        </div>
                        <div className="connection-status">
                            {twitterAccounts.length > 0 ? (
                                <span className="connected">✅ Connected</span>
                            ) : (
                                <span className="disconnected">❌ Not Connected</span>
                            )}
                        </div>
                    </div>

                    {twitterAccounts.length > 0 ? (
                        <div className="connected-accounts">
                            {twitterAccounts.map(account => (
                                <div key={account.id} className="account-item">
                                    <div className="account-info">
                                        <span className="username">@{account.username}</span>
                                        <span className={`status ${account.isActive ? 'active' : 'inactive'}`}>
                                            {account.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => disconnectAccount(account.id, 'twitter')}
                                        className="btn btn-sm btn-danger"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="connection-actions">
                            <p>Connect your X account to start posting content automatically.</p>
                            <button
                                onClick={connectTwitter}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? '🔄 Connecting...' : '🔗 Connect X Account'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="platform-card">
                    <div className="platform-header">
                        <div className="platform-info">
                            <span className="platform-icon">📸</span>
                            <h3>Instagram</h3>
                        </div>
                        <div className="connection-status">
                            {instagramAccounts.length > 0 ? (
                                <span className="connected">✅ Connected</span>
                            ) : (
                                <span className="disconnected">❌ Not Connected</span>
                            )}
                        </div>
                    </div>

                    {instagramAccounts.length > 0 ? (
                        <div className="connected-accounts">
                            {instagramAccounts.map(account => (
                                <div key={account.id} className="account-item">
                                    <div className="account-info">
                                        <span className="username">@{account.username}</span>
                                        <span className={`status ${account.isActive ? 'active' : 'inactive'}`}>
                                            {account.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => disconnectAccount(account.id, 'instagram')}
                                        className="btn btn-sm btn-danger"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="connection-actions">
                            <p>Connect your Instagram Business account to post content automatically.</p>
                            <button 
                                onClick={connectInstagram}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? '🔄 Connecting...' : '🔗 Connect Instagram'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {stats && (
                <div className="posting-stats">
                    <h3>📊 Posting Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{stats.totalPosts}</div>
                            <div className="stat-label">Total Posts</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.successfulPosts}</div>
                            <div className="stat-label">Successful</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.failedPosts}</div>
                            <div className="stat-label">Failed</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">
                                {stats.totalPosts > 0 ? Math.round((stats.successfulPosts / stats.totalPosts) * 100) : 0}%
                            </div>
                            <div className="stat-label">Success Rate</div>
                        </div>
                    </div>
                </div>
            )}

            {availableContent.length > 0 && (accounts.length > 0) && (
                <div className="content-posting">
                    <h3>📝 Post Content</h3>
                    <p>Select content to post to your connected social media accounts.</p>
                    
                    <div className="content-list">
                        {availableContent.slice(0, 5).map(content => (
                            <div key={content.id} className="content-item">
                                <div className="content-preview">
                                    <h4>{content.title || 'Untitled'}</h4>
                                    <p>{content.content.substring(0, 100)}...</p>
                                    <div className="content-meta">
                                        <span className="niche">{content.niche_name}</span>
                                        <span className="type">{content.type}</span>
                                    </div>
                                </div>
                                <div className="posting-actions">
                                    <div className="platform-checkboxes">
                                        {twitterAccounts.length > 0 && (
                                            <label>
                                                <input type="checkbox" value="twitter" />
                                                <span>🐦 X</span>
                                            </label>
                                        )}
                                        {instagramAccounts.length > 0 && (
                                            <label>
                                                <input type="checkbox" value="instagram" />
                                                <span>📸 Instagram</span>
                                            </label>
                                        )}
                                    </div>
                                    <button 
                                        className="btn btn-sm btn-primary"
                                        disabled={loading}
                                    >
                                        📤 Post Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="integration-help">
                <h3>💡 Tips</h3>
                <ul>
                    <li><strong>X:</strong> Posts are limited to 280 characters</li>
                    <li><strong>Instagram:</strong> Requires business account for API access</li>
                    <li><strong>Scheduling:</strong> Plan your posts for optimal engagement times</li>
                    <li><strong>Analytics:</strong> Track performance across all platforms</li>
                </ul>
            </div>
        </div>
    );
};

export default SocialMediaIntegration;
