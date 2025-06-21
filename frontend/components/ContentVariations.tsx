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
}

interface ContentVariation {
  id: string;
  style: string;
  emotion: string;
  content: {
    tweet: string;
    instagram: string;
    hashtags: string;
    imagePrompt: string;
  };
  generating: boolean;
  error?: string;
}

const ContentVariations: React.FC = () => {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<number | null>(null);
  const [variations, setVariations] = useState<ContentVariation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const contentStyles = [
    { id: 'inspirational', name: 'Inspirational & Motivating', emotion: 'empowerment', icon: '🚀' },
    { id: 'educational', name: 'Educational & Informative', emotion: 'curiosity', icon: '📚' },
    { id: 'entertaining', name: 'Entertaining & Humorous', emotion: 'joy', icon: '😄' },
    { id: 'thoughtful', name: 'Thought-provoking & Insightful', emotion: 'contemplation', icon: '🤔' },
    { id: 'conversational', name: 'Conversational & Relatable', emotion: 'connection', icon: '💬' },
    { id: 'authoritative', name: 'Authoritative & Expert', emotion: 'trust', icon: '🎯' },
    { id: 'storytelling', name: 'Storytelling & Narrative', emotion: 'engagement', icon: '📖' },
    { id: 'controversial', name: 'Controversial & Debate-worthy', emotion: 'passion', icon: '🔥' }
  ];

  useEffect(() => {
    loadNiches();
  }, []);

  const loadNiches = async () => {
    try {
      const response = await ApiService.get('/api/niches');
      setNiches(response);
    } catch (error) {
      console.error('Error loading niches:', error);
    }
  };

  const handleStyleToggle = (styleId: string) => {
    setSelectedStyles(prev => {
      if (!Array.isArray(prev)) return [styleId];
      return prev.includes(styleId)
        ? prev.filter(id => id !== styleId)
        : [...prev, styleId];
    });
  };

  const selectAllStyles = () => {
    if (Array.isArray(contentStyles)) {
      setSelectedStyles(contentStyles.map(style => style.id));
    }
  };

  const clearStyles = () => {
    setSelectedStyles([]);
  };

  const generateVariations = async () => {
    if (!selectedNiche) {
      alert('Please select a niche first');
      return;
    }

    if (selectedStyles.length === 0) {
      alert('Please select at least one content style');
      return;
    }

    setGenerating(true);
    SoundService.playGenerating();

    // Clear any previous errors
    setError(null);

    // Initialize variations
    if (!Array.isArray(selectedStyles) || selectedStyles.length === 0) {
      setError('Please select at least one content style');
      setGenerating(false);
      return;
    }

    const newVariations: ContentVariation[] = selectedStyles.map(styleId => {
      const style = contentStyles.find(s => s.id === styleId);
      return {
        id: `${styleId}-${Date.now()}`,
        style: style?.name || styleId,
        emotion: style?.emotion || 'engagement',
        content: {
          tweet: '',
          instagram: '',
          hashtags: '',
          imagePrompt: ''
        },
        generating: true
      };
    });

    setVariations(newVariations);

    try {
      // Generate content for each selected style
      const promises = selectedStyles.map(async (styleId, index) => {
        try {
          const response = await ApiService.post('/api/generate-content-variation', {
            niche_id: selectedNiche,
            style: styleId,
            emotion: contentStyles.find(s => s.id === styleId)?.emotion
          });

          return {
            index,
            success: true,
            content: response
          };
        } catch (error) {
          console.error(`Error generating ${styleId} variation:`, error);
          return {
            index,
            success: false,
            error: error instanceof Error ? error.message : 'Generation failed'
          };
        }
      });

      const results = await Promise.all(promises);

      // Update variations with results
      setVariations(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.map((variation, index) => {
        const result = results[index];
        if (result.success) {
          return {
            ...variation,
            content: result.content,
            generating: false
          };
        } else {
          return {
            ...variation,
            generating: false,
            error: result.error
          };
        }
      });
      });

      SoundService.playSuccess();
    } catch (error) {
      console.error('Error generating variations:', error);
      SoundService.playError();
      alert('Failed to generate content variations');
    } finally {
      setGenerating(false);
    }
  };

  const regenerateVariation = async (variationId: string) => {
    const variation = variations.find(v => v.id === variationId);
    if (!variation || !selectedNiche) return;

    setVariations(prev => {
      if (!Array.isArray(prev)) return [];
      return prev.map(v =>
        v.id === variationId ? { ...v, generating: true, error: undefined } : v
      );
    });

    try {
      const styleId = variation.style.toLowerCase().split(' ')[0];
      const response = await ApiService.post('/api/generate-content-variation', {
        niche_id: selectedNiche,
        style: styleId,
        emotion: variation.emotion
      });

      setVariations(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.map(v =>
          v.id === variationId
            ? { ...v, content: response, generating: false }
            : v
        );
      });

      SoundService.playSuccess();
    } catch (error) {
      console.error('Error regenerating variation:', error);
      setVariations(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.map(v =>
          v.id === variationId
            ? { ...v, generating: false, error: 'Regeneration failed' }
            : v
        );
      });
      SoundService.playError();
    }
  };

  const saveVariation = async (variation: ContentVariation) => {
    try {
      await ApiService.post('/api/save-content-variation', {
        niche_id: selectedNiche,
        content: variation.content,
        style: variation.style,
        emotion: variation.emotion
      });

      SoundService.playSuccess();
      alert('✅ Content variation saved successfully!');
    } catch (error) {
      console.error('Error saving variation:', error);
      SoundService.playError();
      alert('❌ Failed to save content variation');
    }
  };

  const getSelectedNicheName = () => {
    const niche = niches.find(n => n.id === selectedNiche);
    return niche ? niche.name : 'Select a niche';
  };

  return (
    <div className="content-variations">
      <div className="variations-header">
        <h2>🎨 Content Variations</h2>
        <p>Generate multiple versions of content with different tones and styles</p>
      </div>

      <div className="variations-setup">
        {/* Niche Selection */}
        <div className="setup-section">
          <h3>📍 Select Niche</h3>
          <select
            value={selectedNiche || ''}
            onChange={(e) => setSelectedNiche(Number(e.target.value) || null)}
            className="niche-select"
            disabled={generating}
          >
            <option value="">Choose a niche...</option>
            {Array.isArray(niches) && niches
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(niche => (
                <option key={niche.id} value={niche.id}>
                  {niche.name}
                </option>
              ))
            }
          </select>
          {selectedNiche && (
            <div className="selected-niche-info">
              <strong>{getSelectedNicheName()}</strong>
            </div>
          )}
        </div>

        {/* Style Selection */}
        <div className="setup-section">
          <h3>🎭 Select Content Styles</h3>
          <div className="style-controls">
            <button onClick={selectAllStyles} disabled={generating} className="control-btn">
              ✅ Select All
            </button>
            <button onClick={clearStyles} disabled={generating} className="control-btn">
              🔄 Clear All
            </button>
            <span className="selection-count">
              {selectedStyles.length} of {contentStyles.length} selected
            </span>
          </div>

          <div className="styles-grid">
            {Array.isArray(contentStyles) && contentStyles.map(style => (
              <div
                key={style.id}
                className={`style-card ${selectedStyles.includes(style.id) ? 'selected' : ''}`}
                onClick={() => !generating && handleStyleToggle(style.id)}
              >
                <div className="style-icon">{style.icon}</div>
                <div className="style-content">
                  <div className="style-name">{style.name}</div>
                  <div className="style-emotion">Target: {style.emotion}</div>
                </div>
                <div className="style-checkbox">
                  {selectedStyles.includes(style.id) && '✓'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="generate-section">
          <button
            className="generate-variations-btn"
            onClick={generateVariations}
            disabled={!selectedNiche || selectedStyles.length === 0 || generating}
          >
            {generating 
              ? `⏳ Generating ${selectedStyles.length} variations...`
              : `🎨 Generate ${selectedStyles.length} Content Variations`
            }
          </button>
        </div>
      </div>

      {/* Variations Display */}
      {variations.length > 0 && (
        <div className="variations-results">
          <h3>📊 Generated Variations</h3>
          <div className="variations-grid">
            {Array.isArray(variations) && variations.map(variation => (
              <div key={variation.id} className="variation-card">
                <div className="variation-header">
                  <div className="variation-style">
                    {contentStyles.find(s => s.name === variation.style)?.icon} {variation.style}
                  </div>
                  <div className="variation-emotion">
                    Emotion: {variation.emotion}
                  </div>
                </div>

                {variation.generating ? (
                  <div className="variation-loading">
                    <div className="loading-spinner"></div>
                    <p>Generating {variation.style.toLowerCase()} content...</p>
                  </div>
                ) : variation.error ? (
                  <div className="variation-error">
                    <p>❌ {variation.error}</p>
                    <button 
                      onClick={() => regenerateVariation(variation.id)}
                      className="retry-btn"
                    >
                      🔄 Retry
                    </button>
                  </div>
                ) : (
                  <div className="variation-content">
                    <div className="content-preview">
                      <div className="preview-section">
                        <h4>🐦 X Post</h4>
                        <p>{variation.content.tweet}</p>
                      </div>
                      <div className="preview-section">
                        <h4>📸 Instagram</h4>
                        <p>{variation.content.instagram.substring(0, 100)}...</p>
                      </div>
                    </div>
                    
                    <div className="variation-actions">
                      <button 
                        onClick={() => saveVariation(variation)}
                        className="save-btn"
                      >
                        💾 Save
                      </button>
                      <button 
                        onClick={() => regenerateVariation(variation.id)}
                        className="regenerate-btn"
                      >
                        🔄 Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentVariations;
