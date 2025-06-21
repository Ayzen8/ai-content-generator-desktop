import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import SoundService from '../services/soundService';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
  available: boolean;
  features: string[];
  isCurrent: boolean;
  isFallback?: boolean;
}

interface ModelStats {
  available: number;
  total: number;
  providers: string[];
  current: string;
  fallback: string;
}

const AIModelSelector: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [currentModel, setCurrentModel] = useState<AIModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await ApiService.get('/api/ai-models');
      setModels(response.models);
      setStats(response.stats);
      setCurrentModel(response.current);
    } catch (error) {
      console.error('Error loading AI models:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchModel = async (modelId: string) => {
    if (!currentModel || modelId === currentModel.id) return;

    setSwitching(modelId);
    try {
      const response = await ApiService.post('/api/ai-models/set-current', {
        modelId,
        previousModel: currentModel.id
      });

      if (response.success) {
        await loadModels(); // Reload to get updated state
        SoundService.playSuccess();
        alert(`✅ Successfully switched to ${response.currentModel.name}!`);
      } else {
        SoundService.playError();
        alert(`❌ Failed to switch model: ${response.error}`);
      }
    } catch (error) {
      console.error('Error switching model:', error);
      SoundService.playError();
      alert('❌ Failed to switch AI model');
    } finally {
      setSwitching(null);
    }
  };

  const testModel = async (modelId: string) => {
    setTesting(modelId);
    try {
      const response = await ApiService.post('/api/ai-models/test', { modelId });
      
      if (response.success) {
        SoundService.playSuccess();
        alert(`✅ ${models.find(m => m.id === modelId)?.name} is working correctly!`);
      } else {
        SoundService.playError();
        alert(`❌ Test failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error testing model:', error);
      SoundService.playError();
      alert('❌ Failed to test AI model');
    } finally {
      setTesting(null);
    }
  };

  const getProviderColor = (provider: string) => {
    const colors = {
      'Google': '#4285f4',
      'Anthropic': '#ff6b35',
      'OpenAI': '#00a67e'
    };
    return colors[provider as keyof typeof colors] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="ai-model-selector loading">
        <div className="loading-spinner"></div>
        <p>Loading AI models...</p>
      </div>
    );
  }

  return (
    <div className="ai-model-selector">
      <div className="selector-header">
        <h3>🤖 AI Model Selection</h3>
        <p>Choose the AI model for content generation</p>
      </div>

      {/* Current Model Display */}
      {currentModel && (
        <div className="current-model-display">
          <div className="current-model-card">
            <div className="model-icon">{currentModel.icon}</div>
            <div className="model-info">
              <div className="model-name">{currentModel.name}</div>
              <div className="model-provider">by {currentModel.provider}</div>
              <div className="model-status">✅ Currently Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Model Statistics */}
      {stats && (
        <div className="model-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.available}</span>
            <span className="stat-label">Available Models</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.providers.length}</span>
            <span className="stat-label">AI Providers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Models</span>
          </div>
        </div>
      )}

      {/* Available Models */}
      <div className="models-section">
        <h4>Available Models</h4>
        <div className="models-grid">
          {models.filter(model => model.available).map(model => (
            <div
              key={model.id}
              className={`model-card ${model.isCurrent ? 'current' : ''}`}
            >
              <div className="model-header">
                <div className="model-icon">{model.icon}</div>
                <div className="model-title">
                  <div className="model-name">{model.name}</div>
                  <div 
                    className="model-provider"
                    style={{ color: getProviderColor(model.provider) }}
                  >
                    {model.provider}
                  </div>
                </div>
                {model.isCurrent && (
                  <div className="current-badge">Current</div>
                )}
              </div>

              <div className="model-description">
                {model.description}
              </div>

              <div className="model-features">
                {model.features.map((feature, index) => (
                  <span key={index} className="feature-tag">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="model-actions">
                <button
                  onClick={() => testModel(model.id)}
                  disabled={testing === model.id}
                  className="test-btn"
                >
                  {testing === model.id ? '⏳ Testing...' : '🧪 Test'}
                </button>
                
                {!model.isCurrent && (
                  <button
                    onClick={() => switchModel(model.id)}
                    disabled={switching === model.id}
                    className="switch-btn"
                  >
                    {switching === model.id ? '⏳ Switching...' : '🔄 Switch'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unavailable Models */}
      {models.some(model => !model.available) && (
        <div className="models-section">
          <h4>Coming Soon</h4>
          <div className="models-grid">
            {models.filter(model => !model.available).map(model => (
              <div key={model.id} className="model-card unavailable">
                <div className="model-header">
                  <div className="model-icon">{model.icon}</div>
                  <div className="model-title">
                    <div className="model-name">{model.name}</div>
                    <div 
                      className="model-provider"
                      style={{ color: getProviderColor(model.provider) }}
                    >
                      {model.provider}
                    </div>
                  </div>
                  <div className="unavailable-badge">Coming Soon</div>
                </div>

                <div className="model-description">
                  {model.description}
                </div>

                <div className="model-features">
                  {model.features.map((feature, index) => (
                    <span key={index} className="feature-tag disabled">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="model-actions">
                  <button disabled className="unavailable-btn">
                    🔒 Not Available
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Information */}
      <div className="model-info-section">
        <h4>💡 Model Information</h4>
        <div className="info-cards">
          <div className="info-card">
            <h5>🚀 Gemini 2.5 Flash</h5>
            <p>Google's latest and fastest model with excellent quality and speed. Perfect for real-time content generation.</p>
          </div>
          <div className="info-card">
            <h5>🧠 Gemini 1.5 Pro</h5>
            <p>Advanced reasoning capabilities with longer context windows. Ideal for complex content requiring deep analysis.</p>
          </div>
          <div className="info-card">
            <h5>✍️ Claude 3 Sonnet</h5>
            <p>Anthropic's balanced model with exceptional writing capabilities. Great for creative and nuanced content.</p>
          </div>
          <div className="info-card">
            <h5>⚡ GPT-4 Turbo</h5>
            <p>OpenAI's latest model with improved speed and capabilities. Versatile for various content types.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModelSelector;
