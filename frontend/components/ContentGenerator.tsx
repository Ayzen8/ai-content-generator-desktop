import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import SoundService from '../services/soundService';
import ContentCard from './ContentCard';

interface Niche {
  id: number;
  name: string;
  description: string;
  persona: string;
  keywords: string;
  parent_id: number | null;
}

interface Content {
  id: number;
  niche_id: number;
  niche_name: string;
  tweet: string;
  instagram: string;
  hashtags: string;
  imagePrompt: string;
  status: string;
  created_at: string;
}

const ContentGenerator: React.FC = () => {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    loadNiches();
    loadContent();
  }, [filter]);

  const loadNiches = async () => {
    try {
      const response = await ApiService.get('/api/niches');
      setNiches(response);
    } catch (error) {
      console.error('Error loading niches:', error);
      setError('Failed to load niches');
    }
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      if (selectedNiche) {
        params.append('niche_id', selectedNiche.toString());
      }
      
      const response = await ApiService.get(`/api/content?${params.toString()}`);
      setContent(response);
      setError(null);
    } catch (error) {
      console.error('Error loading content:', error);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    if (!selectedNiche) {
      alert('Please select a niche first');
      return;
    }

    setGenerating(true);
    SoundService.playGenerating(); // Play sound when generation starts

    try {
      await ApiService.post('/api/generate-content', { niche_id: selectedNiche });
      await loadContent();
      setError(null);
      SoundService.playSuccess(); // Play success sound
    } catch (error) {
      console.error('Error generating content:', error);
      setError('Failed to generate content. Please check your Gemini API key.');
      SoundService.playError(); // Play error sound
    } finally {
      setGenerating(false);
    }
  };

  const testGeminiConnection = async () => {
    try {
      const response = await ApiService.get('/api/test-gemini');
      if (response.success) {
        alert('✅ Gemini API connection successful!');
      } else {
        alert(`❌ Gemini API connection failed: ${response.error}`);
      }
    } catch (error) {
      alert('❌ Failed to test Gemini API connection');
    }
  };

  const getSelectedNicheName = () => {
    const niche = niches.find(n => n.id === selectedNiche);
    return niche ? niche.name : 'Select a niche';
  };

  const getSelectedNicheInfo = () => {
    const niche = niches.find(n => n.id === selectedNiche);
    if (!niche) return null;

    const isSubNiche = niche.parent_id !== null;
    const parentNiche = isSubNiche ? niches.find(n => n.id === niche.parent_id) : null;

    return {
      niche,
      isSubNiche,
      parentNiche,
      displayName: isSubNiche && parentNiche
        ? `${parentNiche.name} → ${niche.name}`
        : niche.name
    };
  };

  const getContentStats = () => {
    const pending = content.filter(c => c.status === 'pending').length;
    const posted = content.filter(c => c.status === 'posted').length;
    const total = content.length;

    return { pending, posted, total };
  };

  const renderNicheOptions = () => {
    // Sort all niches alphabetically by name
    const sortedNiches = niches.sort((a, b) => a.name.localeCompare(b.name));

    return sortedNiches.map(niche => (
      <option
        key={niche.id}
        value={niche.id}
      >
        {niche.name}
      </option>
    ));
  };

  const stats = getContentStats();

  return (
    <div className="content-generator">
      <div className="generator-header">
        <h2>🤖 AI Content Generator</h2>
        <button 
          className="test-api-btn"
          onClick={testGeminiConnection}
        >
          🔧 Test API
        </button>
      </div>

      {/* Content Stats */}
      <div className="content-stats">
        <div className="stat-item">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total Content</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.posted}</span>
          <span className="stat-label">Posted</span>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="generation-controls">
        <div className="control-group">
          <label htmlFor="nicheSelect">Select Niche:</label>
          <select
            id="nicheSelect"
            className="niche-dropdown"
            value={selectedNiche || ''}
            onChange={(e) => setSelectedNiche(Number(e.target.value) || null)}
          >
            <option value="">Choose a niche...</option>
            {renderNicheOptions()}
          </select>
        </div>

        <button
          className="generate-btn"
          onClick={generateContent}
          disabled={!selectedNiche || generating}
        >
          {generating ? '⏳ Generating...' : '✨ Generate Content'}
        </button>
      </div>

      {/* Selected Niche Info */}
      {selectedNiche && (
        <div className="selected-niche-info">
          <div className="niche-info-header">
            <h4>📍 Selected Niche</h4>
          </div>
          <div className="niche-info-content">
            {(() => {
              const nicheInfo = getSelectedNicheInfo();
              if (!nicheInfo) return null;

              return (
                <div className="niche-details">
                  <div className="niche-name">
                    {nicheInfo.isSubNiche && (
                      <span className="niche-breadcrumb">
                        📁 {nicheInfo.parentNiche?.name} →
                      </span>
                    )}
                    <span className="current-niche">
                      {nicheInfo.isSubNiche ? '├─' : '📁'} {nicheInfo.niche.name}
                    </span>
                  </div>
                  <div className="niche-description">
                    {nicheInfo.niche.description}
                  </div>
                  <div className="niche-keywords">
                    {nicheInfo.niche.keywords.split(',').slice(0, 5).map((keyword, index) => (
                      <span key={index} className="keyword-tag">
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Content Filters */}
      <div className="content-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Content
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button 
          className={`filter-btn ${filter === 'posted' ? 'active' : ''}`}
          onClick={() => setFilter('posted')}
        >
          Posted
        </button>
        <button 
          className={`filter-btn ${filter === 'deleted' ? 'active' : ''}`}
          onClick={() => setFilter('deleted')}
        >
          Deleted
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Content Display */}
      <div className="content-grid">
        {loading ? (
          <div className="loading-message">
            ⏳ Loading content...
          </div>
        ) : content.length === 0 ? (
          <div className="empty-message">
            <h3>No content found</h3>
            <p>
              {selectedNiche 
                ? `Generate some content for ${getSelectedNicheName()}!`
                : 'Select a niche and generate your first content!'
              }
            </p>
          </div>
        ) : (
          content.map(item => (
            <ContentCard 
              key={item.id}
              content={item}
              onContentUpdate={loadContent}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ContentGenerator;
