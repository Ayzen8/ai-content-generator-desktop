import React, { useState } from 'react';
import ApiService from '../services/api';
import SoundService from '../services/soundService';

interface QualityScore {
  score: number;
  factors: Record<string, number>;
}

interface QualityAnalysis {
  overallScore: number;
  scores: {
    engagement: QualityScore;
    readability: QualityScore;
    relevance: QualityScore;
    creativity: QualityScore;
    technical: QualityScore;
  };
  suggestions: Array<{
    category: string;
    type: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  strengths: Array<{
    category: string;
    score: number;
    message: string;
  }>;
  improvements: Array<{
    category: string;
    score: number;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  grade: string;
  viralPotential: {
    score: number;
    potential: string;
    factors: string[];
  };
}

interface ContentQualityAnalyzerProps {
  content?: {
    tweet: string;
    instagram: string;
    hashtags: string;
    imagePrompt: string;
  };
  nicheId?: number;
  onAnalysisComplete?: (analysis: QualityAnalysis) => void;
}

const ContentQualityAnalyzer: React.FC<ContentQualityAnalyzerProps> = ({
  content: initialContent,
  nicheId,
  onAnalysisComplete
}) => {
  const [content, setContent] = useState(initialContent || {
    tweet: '',
    instagram: '',
    hashtags: '',
    imagePrompt: ''
  });
  const [analysis, setAnalysis] = useState<QualityAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [improvedContent, setImprovedContent] = useState<any>(null);
  const [improving, setImproving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const analyzeContent = async () => {
    if (!content.tweet && !content.instagram) {
      alert('Please provide content to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await ApiService.post('/api/analyze-content-quality', {
        content,
        niche_id: nicheId
      });

      if (response.success) {
        setAnalysis(response.analysis);
        onAnalysisComplete?.(response.analysis);
        SoundService.playSuccess();
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      SoundService.playError();
      alert('Failed to analyze content quality');
    } finally {
      setAnalyzing(false);
    }
  };

  const improveContent = async () => {
    if (!analysis) {
      alert('Please analyze content first');
      return;
    }

    setImproving(true);
    try {
      const response = await ApiService.post('/api/improve-content', {
        content,
        analysis,
        niche_id: nicheId
      });

      if (response.success) {
        setImprovedContent(response.improvedContent);
        setShowComparison(true);
        SoundService.playSuccess();
      } else {
        throw new Error('Content improvement failed');
      }
    } catch (error) {
      console.error('Error improving content:', error);
      SoundService.playError();
      alert('Failed to improve content');
    } finally {
      setImproving(false);
    }
  };

  const useImprovedContent = () => {
    setContent(improvedContent);
    setImprovedContent(null);
    setShowComparison(false);
    setAnalysis(null);
    alert('Improved content applied! You can now analyze it again.');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 70) return '#f59e0b'; // Yellow
    if (score >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#10b981';
    if (grade.startsWith('B')) return '#f59e0b';
    if (grade.startsWith('C')) return '#f97316';
    return '#ef4444';
  };

  const getViralPotentialColor = (potential: string) => {
    switch (potential) {
      case 'Very High': return '#8b5cf6';
      case 'High': return '#10b981';
      case 'Medium': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderScoreCircle = (score: number, label: string, size: 'small' | 'large' = 'small') => {
    const radius = size === 'large' ? 45 : 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className={`score-circle ${size}`}>
        <svg width={size === 'large' ? 120 : 90} height={size === 'large' ? 120 : 90}>
          <circle
            cx={size === 'large' ? 60 : 45}
            cy={size === 'large' ? 60 : 45}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size === 'large' ? 60 : 45}
            cy={size === 'large' ? 60 : 45}
            r={radius}
            stroke={getScoreColor(score)}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size === 'large' ? 60 : 45} ${size === 'large' ? 60 : 45})`}
          />
        </svg>
        <div className="score-text">
          <div className="score-number">{score}</div>
          <div className="score-label">{label}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="content-quality-analyzer">
      <div className="analyzer-header">
        <h3>📊 Content Quality Analyzer</h3>
        <p>Get AI-powered insights to improve your content quality and engagement</p>
      </div>

      {!initialContent && (
        <div className="content-input-section">
          <div className="input-group">
            <label>X Post Content</label>
            <textarea
              value={content.tweet}
              onChange={(e) => setContent(prev => ({ ...prev, tweet: e.target.value }))}
              placeholder="Enter your X post content..."
              maxLength={280}
              rows={3}
            />
            <div className="char-count">{content.tweet.length}/280</div>
          </div>

          <div className="input-group">
            <label>Instagram Caption</label>
            <textarea
              value={content.instagram}
              onChange={(e) => setContent(prev => ({ ...prev, instagram: e.target.value }))}
              placeholder="Enter your Instagram caption..."
              rows={5}
            />
          </div>

          <div className="input-group">
            <label>Hashtags</label>
            <input
              type="text"
              value={content.hashtags}
              onChange={(e) => setContent(prev => ({ ...prev, hashtags: e.target.value }))}
              placeholder="#hashtag1 #hashtag2 #hashtag3"
            />
          </div>

          <button
            className="analyze-btn"
            onClick={analyzeContent}
            disabled={analyzing || (!content.tweet && !content.instagram)}
          >
            {analyzing ? '⏳ Analyzing...' : '🔍 Analyze Quality'}
          </button>
        </div>
      )}

      {initialContent && !analysis && (
        <div className="quick-analyze">
          <button
            className="analyze-btn"
            onClick={analyzeContent}
            disabled={analyzing}
          >
            {analyzing ? '⏳ Analyzing...' : '🔍 Analyze This Content'}
          </button>
        </div>
      )}

      {analysis && (
        <div className="analysis-results">
          {/* Overall Score */}
          <div className="overall-score-section">
            <div className="score-display">
              {renderScoreCircle(analysis.overallScore, 'Overall', 'large')}
              <div className="grade-display">
                <div 
                  className="grade"
                  style={{ color: getGradeColor(analysis.grade) }}
                >
                  {analysis.grade}
                </div>
                <div className="grade-label">Grade</div>
              </div>
              <div className="viral-potential">
                <div 
                  className="potential-score"
                  style={{ color: getViralPotentialColor(analysis.viralPotential.potential) }}
                >
                  {analysis.viralPotential.potential}
                </div>
                <div className="potential-label">Viral Potential</div>
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="category-scores">
            <h4>📈 Category Breakdown</h4>
            <div className="scores-grid">
              {Object.entries(analysis.scores).map(([category, data]) => (
                <div key={category} className="category-score">
                  {renderScoreCircle(data.score, category.charAt(0).toUpperCase() + category.slice(1))}
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="strengths-section">
              <h4>💪 Strengths</h4>
              <div className="strengths-list">
                {analysis.strengths.map((strength, index) => (
                  <div key={index} className="strength-item">
                    <div className="strength-category">✅ {strength.category}</div>
                    <div className="strength-message">{strength.message}</div>
                    <div className="strength-score">{strength.score}/100</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {analysis.improvements.length > 0 && (
            <div className="improvements-section">
              <div className="improvements-header">
                <h4>🎯 Areas for Improvement</h4>
                <button
                  className="improve-content-btn"
                  onClick={improveContent}
                  disabled={improving}
                >
                  {improving ? '⏳ Improving...' : '✨ Auto-Improve Content'}
                </button>
              </div>
              <div className="improvements-list">
                {analysis.improvements.map((improvement, index) => (
                  <div key={index} className={`improvement-item priority-${improvement.priority}`}>
                    <div className="improvement-header">
                      <div className="improvement-category">
                        {improvement.priority === 'high' ? '🔴' : '🟡'} {improvement.category}
                      </div>
                      <div className="improvement-score">{improvement.score}/100</div>
                    </div>
                    <div className="improvement-message">{improvement.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="suggestions-section">
              <h4>💡 Actionable Suggestions</h4>
              <div className="suggestions-list">
                {analysis.suggestions.map((suggestion, index) => (
                  <div key={index} className={`suggestion-item priority-${suggestion.priority}`}>
                    <div className="suggestion-header">
                      <div className="suggestion-category">{suggestion.category}</div>
                      <div className={`priority-badge priority-${suggestion.priority}`}>
                        {suggestion.priority}
                      </div>
                    </div>
                    <div className="suggestion-message">{suggestion.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viral Factors */}
          {analysis.viralPotential.factors.length > 0 && (
            <div className="viral-factors-section">
              <h4>🚀 Viral Potential Factors</h4>
              <div className="viral-factors">
                {analysis.viralPotential.factors.map((factor, index) => (
                  <span key={index} className="viral-factor">
                    ⭐ {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Breakdown Toggle */}
          <div className="details-toggle">
            <button
              className="toggle-details-btn"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '📊 Hide Details' : '📊 Show Detailed Breakdown'}
            </button>
          </div>

          {/* Detailed Breakdown */}
          {showDetails && (
            <div className="detailed-breakdown">
              <h4>🔍 Detailed Factor Analysis</h4>
              {Object.entries(analysis.scores).map(([category, data]) => (
                <div key={category} className="category-details">
                  <h5>{category.charAt(0).toUpperCase() + category.slice(1)} Factors</h5>
                  <div className="factors-grid">
                    {Object.entries(data.factors).map(([factor, score]) => (
                      <div key={factor} className="factor-item">
                        <div className="factor-name">{factor.replace(/_/g, ' ')}</div>
                        <div className="factor-bar">
                          <div 
                            className="factor-fill"
                            style={{ 
                              width: `${score}%`,
                              backgroundColor: getScoreColor(score)
                            }}
                          ></div>
                        </div>
                        <div className="factor-score">{score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Comparison View */}
      {showComparison && improvedContent && (
        <div className="content-comparison">
          <div className="comparison-header">
            <h3>📊 Content Comparison</h3>
            <p>Compare your original content with AI-improved version</p>
          </div>

          <div className="comparison-grid">
            {/* Original Content */}
            <div className="content-column original">
              <h4>📝 Original Content</h4>
              <div className="content-preview">
                <div className="content-item">
                  <label>X Post:</label>
                  <div className="content-text">{content.tweet}</div>
                </div>
                <div className="content-item">
                  <label>Instagram:</label>
                  <div className="content-text">{content.instagram}</div>
                </div>
                <div className="content-item">
                  <label>Hashtags:</label>
                  <div className="content-text">{content.hashtags}</div>
                </div>
              </div>
            </div>

            {/* Improved Content */}
            <div className="content-column improved">
              <h4>✨ Improved Content</h4>
              <div className="content-preview">
                <div className="content-item">
                  <label>X Post:</label>
                  <div className="content-text improved-text">{improvedContent.tweet}</div>
                </div>
                <div className="content-item">
                  <label>Instagram:</label>
                  <div className="content-text improved-text">{improvedContent.instagram}</div>
                </div>
                <div className="content-item">
                  <label>Hashtags:</label>
                  <div className="content-text improved-text">{improvedContent.hashtags}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Summary */}
          {improvedContent.improvements && (
            <div className="improvement-summary">
              <h4>🔧 What Was Improved</h4>
              <div className="improvements-applied">
                {improvedContent.improvements.map((improvement: string, index: number) => (
                  <div key={index} className="improvement-applied">
                    ✅ {improvement}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="comparison-actions">
            <button
              className="use-improved-btn"
              onClick={useImprovedContent}
            >
              ✨ Use Improved Content
            </button>
            <button
              className="keep-original-btn"
              onClick={() => setShowComparison(false)}
            >
              📝 Keep Original
            </button>
            <button
              className="analyze-improved-btn"
              onClick={() => {
                setContent(improvedContent);
                setShowComparison(false);
                setImprovedContent(null);
                setTimeout(() => analyzeContent(), 100);
              }}
            >
              🔍 Analyze Improved Version
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentQualityAnalyzer;
