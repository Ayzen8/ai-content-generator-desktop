import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import SoundService from '../services/soundService';
import AIModelSelector from './AIModelSelector';

interface SettingsData {
  geminiApiKey: string;
  leonardoApiKey: string;
  twitterClientId: string;
  twitterClientSecret: string;
  twitterBearerToken: string;
  instagramClientId: string;
  instagramClientSecret: string;
}

interface TwitterAccount {
  user_id: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

interface InstagramAccount {
  user_id: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    geminiApiKey: '',
    leonardoApiKey: '',
    twitterClientId: '',
    twitterClientSecret: '',
    twitterBearerToken: '',
    instagramClientId: '',
    instagramClientSecret: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingApi, setTestingApi] = useState(false);
  const [testingTwitter, setTestingTwitter] = useState(false);
  const [testingInstagram, setTestingInstagram] = useState(false);
  const [connectingTwitter, setConnectingTwitter] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [twitterAccounts, setTwitterAccounts] = useState<TwitterAccount[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [rateLimits, setRateLimits] = useState<any>(null);
  const [instagramRateLimits, setInstagramRateLimits] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(SoundService.isEnabledStatic());

  useEffect(() => {
    loadSettings();
    loadTwitterAccounts();
    loadInstagramAccounts();
    loadRateLimits();
    loadInstagramRateLimits();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await ApiService.get('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      await ApiService.post('/api/settings', settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const testGeminiConnection = async () => {
    if (!settings.geminiApiKey || !settings.geminiApiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter a Gemini API key first.' });
      return;
    }

    setTestingApi(true);
    setMessage(null);

    try {
      const response = await ApiService.post('/api/test-gemini', { 
        apiKey: settings.geminiApiKey 
      });
      
      if (response.success) {
        setMessage({ type: 'success', text: '✅ Gemini API connection successful!' });
      } else {
        setMessage({ type: 'error', text: `❌ Gemini API connection failed: ${response.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to test Gemini API connection' });
    } finally {
      setTestingApi(false);
    }
  };

  const handleInputChange = (field: keyof SettingsData, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const loadTwitterAccounts = async () => {
    try {
      const accounts = await ApiService.get('/api/twitter/accounts');
      setTwitterAccounts(accounts);
    } catch (error) {
      console.error('Error loading Twitter accounts:', error);
    }
  };

  const loadRateLimits = async () => {
    try {
      const limits = await ApiService.get('/api/twitter/rate-limits');
      setRateLimits(limits);
    } catch (error) {
      console.error('Error loading rate limits:', error);
    }
  };

  const connectTwitterAccount = async () => {
    setConnectingTwitter(true);
    setMessage(null);

    try {
      // Get OAuth URL
      const authData = await ApiService.get('/api/twitter/auth-url');

      // Open OAuth window
      const popup = window.open(
        authData.url,
        'twitter-oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnectingTwitter(false);
          // Reload accounts after potential connection
          loadTwitterAccounts();
        }
      }, 1000);

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect Twitter account' });
      setConnectingTwitter(false);
    }
  };

  const testTwitterConnection = async () => {
    setTestingTwitter(true);
    setMessage(null);

    try {
      const response = await ApiService.post('/api/test-twitter', {});

      if (response.success) {
        setMessage({ type: 'success', text: '✅ Twitter API connection successful!' });
      } else {
        setMessage({ type: 'error', text: `❌ Twitter API connection failed: ${response.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to test Twitter API connection' });
    } finally {
      setTestingTwitter(false);
    }
  };

  const loadInstagramAccounts = async () => {
    try {
      const accounts = await ApiService.get('/api/instagram/accounts');
      setInstagramAccounts(accounts);
    } catch (error) {
      console.error('Error loading Instagram accounts:', error);
    }
  };

  const loadInstagramRateLimits = async () => {
    try {
      const limits = await ApiService.get('/api/instagram/rate-limits');
      setInstagramRateLimits(limits);
    } catch (error) {
      console.error('Error loading Instagram rate limits:', error);
    }
  };

  const connectInstagramAccount = async () => {
    setConnectingInstagram(true);
    setMessage(null);

    try {
      // Get OAuth URL
      const authData = await ApiService.get('/api/instagram/auth-url');

      // Open OAuth window
      const popup = window.open(
        authData.url,
        'instagram-oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnectingInstagram(false);
          // Reload accounts after potential connection
          loadInstagramAccounts();
        }
      }, 1000);

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect Instagram account' });
      setConnectingInstagram(false);
    }
  };

  const testInstagramConnection = async () => {
    setTestingInstagram(true);
    setMessage(null);

    try {
      const response = await ApiService.post('/api/test-instagram', {});

      if (response.success) {
        setMessage({ type: 'success', text: '✅ Instagram API connection successful!' });
      } else {
        setMessage({ type: 'error', text: `❌ Instagram API connection failed: ${response.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to test Instagram API connection' });
    } finally {
      setTestingInstagram(false);
    }
  };

  const toggleSoundNotifications = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    SoundService.setEnabled(newState);

    if (newState) {
      SoundService.playSuccess(); // Test sound when enabling
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Settings</h2>
        <p>Configure your API keys and application settings</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>🤖 AI Configuration</h3>
          
          <div className="form-group">
            <label htmlFor="geminiApiKey">
              Gemini API Key
              <span className="required">*</span>
            </label>
            <div className="input-group">
              <input
                type="password"
                id="geminiApiKey"
                value={settings.geminiApiKey}
                onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                placeholder="Enter your Gemini API key"
                className="api-key-input"
              />
              <button
                type="button"
                onClick={testGeminiConnection}
                disabled={testingApi || !settings.geminiApiKey || !settings.geminiApiKey.trim()}
                className="test-btn"
              >
                {testingApi ? '🔄 Testing...' : '🧪 Test'}
              </button>
            </div>
            <small className="help-text">
              Get your API key from{' '}
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Google AI Studio
              </a>
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="leonardoApiKey">
              Leonardo AI API Key
              <span className="premium-badge">Premium</span>
            </label>
            <input
              type="password"
              id="leonardoApiKey"
              value={settings.leonardoApiKey}
              onChange={(e) => handleInputChange('leonardoApiKey', e.target.value)}
              placeholder="Enter your Leonardo AI API key"
              className="api-key-input"
              disabled
            />
            <small className="help-text premium-text">
              🚀 Coming soon - Premium feature for AI image generation
            </small>
          </div>
        </div>

        <div className="settings-section">
          <h3>🐦 X (Twitter) Integration</h3>

          <div className="twitter-accounts">
            <h4>Connected Accounts</h4>
            {twitterAccounts.length > 0 ? (
              <div className="accounts-list">
                {twitterAccounts.map((account) => (
                  <div key={account.user_id} className="account-item">
                    <div className="account-info">
                      <span className="username">@{account.username}</span>
                      <span className={`status ${account.is_active ? 'active' : 'inactive'}`}>
                        {account.is_active ? '✅ Active' : '⏸️ Inactive'}
                      </span>
                    </div>
                    <small className="connected-date">
                      Connected: {new Date(account.created_at).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-accounts">
                <p>No Twitter accounts connected</p>
              </div>
            )}

            <button
              type="button"
              onClick={connectTwitterAccount}
              disabled={connectingTwitter}
              className="connect-btn"
            >
              {connectingTwitter ? '🔄 Connecting...' : '🔗 Connect Twitter Account'}
            </button>
          </div>

          {rateLimits && (
            <div className="rate-limits">
              <h4>Rate Limits (Free Tier)</h4>
              <div className="limits-grid">
                <div className="limit-item">
                  <span className="limit-label">Daily Posts:</span>
                  <span className="limit-value">
                    {rateLimits.daily.used} / {rateLimits.daily.limit}
                  </span>
                  <div className="limit-bar">
                    <div
                      className="limit-progress"
                      style={{
                        width: `${(rateLimits.daily.used / rateLimits.daily.limit) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Monthly Posts:</span>
                  <span className="limit-value">
                    {rateLimits.monthly.used} / {rateLimits.monthly.limit}
                  </span>
                  <div className="limit-bar">
                    <div
                      className="limit-progress"
                      style={{
                        width: `${(rateLimits.monthly.used / rateLimits.monthly.limit) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="twitterClientId">
              Twitter Client ID
              <span className="optional">Optional</span>
            </label>
            <input
              type="text"
              id="twitterClientId"
              value={settings.twitterClientId}
              onChange={(e) => handleInputChange('twitterClientId', e.target.value)}
              placeholder="Enter your Twitter Client ID"
              className="api-key-input"
            />
            <small className="help-text">
              For custom Twitter app configuration. Leave empty to use default.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="twitterClientSecret">
              Twitter Client Secret
              <span className="optional">Optional</span>
            </label>
            <input
              type="password"
              id="twitterClientSecret"
              value={settings.twitterClientSecret}
              onChange={(e) => handleInputChange('twitterClientSecret', e.target.value)}
              placeholder="Enter your Twitter Client Secret"
              className="api-key-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="twitterBearerToken">
              Twitter Bearer Token
              <span className="optional">Optional</span>
            </label>
            <div className="input-group">
              <input
                type="password"
                id="twitterBearerToken"
                value={settings.twitterBearerToken}
                onChange={(e) => handleInputChange('twitterBearerToken', e.target.value)}
                placeholder="Enter your Twitter Bearer Token"
                className="api-key-input"
              />
              <button
                type="button"
                onClick={testTwitterConnection}
                disabled={testingTwitter || !settings.twitterBearerToken || !settings.twitterBearerToken.trim()}
                className="test-btn"
              >
                {testingTwitter ? '🔄 Testing...' : '🧪 Test'}
              </button>
            </div>
            <small className="help-text">
              Get your credentials from{' '}
              <a
                href="https://developer.twitter.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter Developer Portal
              </a>
            </small>
          </div>
        </div>

        <div className="settings-section">
          <h3>🤖 AI Model Configuration</h3>
          <AIModelSelector />
        </div>

        <div className="settings-section">
          <h3>🔊 User Experience</h3>

          <div className="form-group">
            <div className="toggle-setting">
              <div className="toggle-info">
                <label htmlFor="soundNotifications">Sound Notifications</label>
                <small className="help-text">
                  Play audio feedback for content generation, copying, and posting actions
                </small>
              </div>
              <div className="toggle-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    id="soundNotifications"
                    checked={soundEnabled}
                    onChange={toggleSoundNotifications}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <button
                  type="button"
                  onClick={() => SoundService.testSounds()}
                  disabled={!soundEnabled}
                  className="test-sounds-btn"
                  title="Test all sound notifications"
                >
                  🎵 Test Sounds
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>📊 Application Info</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">1.0.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">AI Model:</span>
              <span className="info-value">Gemini 2.5 Flash</span>
            </div>
            <div className="info-item">
              <span className="info-label">Platform:</span>
              <span className="info-value">X & Instagram</span>
            </div>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-actions">
          <button
            type="button"
            onClick={saveSettings}
            disabled={loading}
            className="save-btn"
          >
            {loading ? '💾 Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
