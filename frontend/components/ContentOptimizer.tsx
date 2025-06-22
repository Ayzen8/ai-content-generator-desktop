import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ApiService from '../services/api';

interface ContentAnalysis {
    overall_score: number;
    detailed_scores: {
        engagement: ScoreDetail;
        readability: ScoreDetail;
        value: ScoreDetail;
        optimization: ScoreDetail;
        hook_strength: ScoreDetail;
        call_to_action: ScoreDetail;
        emotional_impact: ScoreDetail;
    };
    recommendations: string[];
    optimization_suggestions: OptimizationSuggestion[];
    viral_potential: number;
    engagement_prediction: number;
}

interface ScoreDetail {
    score: number;
    factors: string[];
    category: string;
}

interface OptimizationSuggestion {
    type: string;
    priority: string;
    suggestion: string;
    impact: string;
}

interface ContentOptimizerProps {
    content: string;
    niche: any;
    platform: 'x' | 'instagram';
    onOptimizedContent?: (content: string) => void;
}

const ContentOptimizer: React.FC<ContentOptimizerProps> = ({
    content,
    niche,
    platform,
    onOptimizedContent
}) => {
    const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [optimizedContent, setOptimizedContent] = useState('');
    const [showOptimizer, setShowOptimizer] = useState(false);
    const [showOptimizedPopup, setShowOptimizedPopup] = useState(false);

    useEffect(() => {
        if (content && content.length > 10) {
            analyzeContent();
        }
    }, [content, platform]);

    const analyzeContent = async () => {
        try {
            setLoading(true);
            const response = await ApiService.post('/api/content/analyze', {
                content,
                niche,
                platform
            });
            setAnalysis(response);
        } catch (error) {
            console.error('Error analyzing content:', error);
        } finally {
            setLoading(false);
        }
    };

    const optimizeContent = async () => {
        try {
            setLoading(true);
            const response = await ApiService.post('/api/content/optimize', {
                content,
                niche,
                platform,
                analysis
            });
            setOptimizedContent(response.optimized_content);
            setShowOptimizedPopup(true);
        } catch (error) {
            console.error('Error optimizing content:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#00ff88';
        if (score >= 60) return '#ffaa00';
        if (score >= 40) return '#ff6b6b';
        return '#ff4444';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#ff4444';
            case 'medium': return '#ffaa00';
            case 'low': return '#00ff88';
            default: return '#ccc';
        }
    };

    if (!content || content.length < 10) {
        return (
            <div className="content-optimizer">
                <div className="optimizer-placeholder">
                    <h3>📊 Content Optimizer</h3>
                    <p>Enter content to see real-time analysis and optimization suggestions</p>
                </div>
            </div>
        );
    }

    return (
        <div className="content-optimizer">
            <div className="optimizer-header">
                <h3>📊 Content Quality Analysis</h3>
                <div className="optimizer-controls">
                    <button 
                        className="analyze-btn"
                        onClick={analyzeContent}
                        disabled={loading}
                    >
                        {loading ? '⏳ Analyzing...' : '🔍 Re-analyze'}
                    </button>
                    {analysis && (
                        <button 
                            className="optimize-btn"
                            onClick={optimizeContent}
                            disabled={loading}
                        >
                            {loading ? '⏳ Optimizing...' : '⚡ Optimize Content'}
                        </button>
                    )}
                </div>
            </div>

            {loading && !analysis && (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Analyzing content quality...</p>
                </div>
            )}

            {analysis && (
                <div className="analysis-results">
                    {/* Overall Score */}
                    <div className="overall-score">
                        <div className="score-circle">
                            <div 
                                className="score-fill"
                                style={{ 
                                    background: `conic-gradient(${getScoreColor(analysis.overall_score)} ${analysis.overall_score * 3.6}deg, #333 0deg)`
                                }}
                            >
                                <div className="score-inner">
                                    <span className="score-number">{analysis.overall_score}</span>
                                    <span className="score-label">Overall</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="score-details">
                            <div className="viral-potential">
                                <span className="metric-label">🔥 Viral Potential:</span>
                                <span className="metric-value" style={{ color: getScoreColor(analysis.viral_potential) }}>
                                    {analysis.viral_potential}%
                                </span>
                            </div>
                            <div className="engagement-prediction">
                                <span className="metric-label">📈 Predicted Engagement:</span>
                                <span className="metric-value" style={{ color: getScoreColor(analysis.engagement_prediction * 20) }}>
                                    {analysis.engagement_prediction}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Scores */}
                    <div className="detailed-scores">
                        <h4>📋 Detailed Analysis</h4>
                        <div className="scores-grid">
                            {Object.entries(analysis.detailed_scores).map(([key, scoreDetail]) => (
                                <div key={key} className="score-card">
                                    <div className="score-header">
                                        <span className="score-name">
                                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                        <span 
                                            className="score-value"
                                            style={{ color: getScoreColor(scoreDetail.score) }}
                                        >
                                            {scoreDetail.score}
                                        </span>
                                    </div>
                                    <div className="score-bar">
                                        <div 
                                            className="score-progress"
                                            style={{ 
                                                width: `${scoreDetail.score}%`,
                                                backgroundColor: getScoreColor(scoreDetail.score)
                                            }}
                                        ></div>
                                    </div>
                                    <div className="score-category">{scoreDetail.category}</div>
                                    <div className="score-factors">
                                        {scoreDetail.factors.slice(0, 2).map((factor, index) => (
                                            <div key={index} className="factor">{factor}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Optimization Suggestions */}
                    {analysis.optimization_suggestions.length > 0 && (
                        <div className="optimization-suggestions">
                            <h4>💡 Optimization Suggestions</h4>
                            <div className="suggestions-list">
                                {analysis.optimization_suggestions.map((suggestion, index) => (
                                    <div key={index} className="suggestion-card">
                                        <div className="suggestion-header">
                                            <span 
                                                className="priority-badge"
                                                style={{ backgroundColor: getPriorityColor(suggestion.priority) }}
                                            >
                                                {suggestion.priority.toUpperCase()}
                                            </span>
                                            <span className="suggestion-type">{suggestion.type}</span>
                                        </div>
                                        <div className="suggestion-text">{suggestion.suggestion}</div>
                                        <div className="suggestion-impact">{suggestion.impact}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations.length > 0 && (
                        <div className="recommendations">
                            <h4>🎯 Recommendations</h4>
                            <div className="recommendations-list">
                                {analysis.recommendations.map((recommendation, index) => (
                                    <div key={index} className="recommendation-item">
                                        {recommendation}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Separate Optimized Content Popup */}
            {showOptimizedPopup && optimizedContent && createPortal(
                <div className="optimized-content-popup">
                    <div className="popup-header">
                        <h3>✨ Your Optimized Content</h3>
                        <button
                            className="popup-close-btn"
                            onClick={() => setShowOptimizedPopup(false)}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="popup-content">
                        <div className="optimized-text-box">
                            {optimizedContent}
                        </div>

                        <div className="popup-actions">
                            <button
                                className="use-btn"
                                onClick={() => {
                                    if (onOptimizedContent) {
                                        onOptimizedContent(optimizedContent);
                                    }
                                    setShowOptimizedPopup(false);
                                }}
                            >
                                ✅ Use This
                            </button>
                            <button
                                className="close-btn"
                                onClick={() => setShowOptimizedPopup(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ContentOptimizer;
