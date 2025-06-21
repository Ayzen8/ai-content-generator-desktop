import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface Hashtag {
    id: number;
    hashtag: string;
    category: string;
    popularity_score: number;
    competition_level: string;
    engagement_potential: number;
    usage_count: number;
    niche_name?: string;
}

interface HashtagMix {
    hashtags: Hashtag[];
    mix_strategy: {
        broad: number;
        niche: number;
        micro: number;
        trending: number;
    };
    total_count: number;
    estimated_reach: number;
}

interface HashtagCombination {
    id: number;
    name: string;
    description: string;
    hashtags: string[];
    performance_score: number;
    usage_count: number;
    is_favorite: boolean;
    niche_name?: string;
}

const HashtagResearch: React.FC = () => {
    const [hashtags, setHashtags] = useState<Hashtag[]>([]);
    const [optimizedMix, setOptimizedMix] = useState<HashtagMix | null>(null);
    const [savedCombinations, setSavedCombinations] = useState<HashtagCombination[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'research' | 'optimizer' | 'saved'>('research');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [targetCount, setTargetCount] = useState(15);
    const [customKeywords, setCustomKeywords] = useState('');

    const categories = [
        { value: '', label: 'All Categories', color: '#ccc' },
        { value: 'broad', label: 'Broad Reach', color: '#ff6b6b' },
        { value: 'niche', label: 'Niche Specific', color: '#4ecdc4' },
        { value: 'micro', label: 'Micro Targeted', color: '#45b7d1' },
        { value: 'trending', label: 'Trending', color: '#96ceb4' }
    ];

    useEffect(() => {
        loadData();
    }, [selectedCategory]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [hashtagsData, combinationsData] = await Promise.all([
                ApiService.get(`/api/hashtag-research?category=${selectedCategory}`),
                ApiService.get('/api/hashtag-research/combinations')
            ]);
            
            setHashtags(hashtagsData);
            setSavedCombinations(combinationsData);
        } catch (error) {
            console.error('Error loading hashtag data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateOptimizedMix = async () => {
        try {
            setLoading(true);
            const response = await ApiService.post('/api/hashtag-research/optimize', {
                targetCount,
                keywords: customKeywords.split(',').map(k => k.trim()).filter(k => k)
            });
            
            setOptimizedMix(response);
        } catch (error) {
            console.error('Error generating optimized mix:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyHashtagsToClipboard = (hashtags: string[]) => {
        const hashtagString = hashtags.join(' ');
        navigator.clipboard.writeText(hashtagString);
        alert('✅ Hashtags copied to clipboard!');
    };

    const getCompetitionColor = (level: string) => {
        switch (level) {
            case 'low': return '#96ceb4';
            case 'medium': return '#feca57';
            case 'high': return '#ff6b6b';
            default: return '#ccc';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'broad': return '🌍';
            case 'niche': return '🎯';
            case 'micro': return '🔍';
            case 'trending': return '🔥';
            default: return '📝';
        }
    };

    const filteredHashtags = hashtags.filter(hashtag =>
        hashtag.hashtag.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && hashtags.length === 0) {
        return (
            <div className="hashtag-research">
                <div className="research-header">
                    <h2>🔍 Hashtag Research</h2>
                </div>
                <LoadingSpinner text="Loading hashtag data..." />
            </div>
        );
    }

    return (
        <div className="hashtag-research">
            <div className="research-header">
                <h2>🔍 Hashtag Research & Optimization</h2>
                <p>Discover and optimize hashtags for maximum reach and engagement</p>
            </div>

            {/* Tab Navigation */}
            <div className="research-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'research' ? 'active' : ''}`}
                    onClick={() => setActiveTab('research')}
                >
                    🔍 Research
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'optimizer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('optimizer')}
                >
                    ⚡ Optimizer
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('saved')}
                >
                    💾 Saved Sets
                </button>
            </div>

            {activeTab === 'research' && (
                <div className="research-content">
                    {/* Search and Filter */}
                    <div className="research-controls">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search hashtags..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        
                        <div className="category-filters">
                            {categories.map(category => (
                                <button
                                    key={category.value}
                                    className={`category-filter ${selectedCategory === category.value ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(category.value)}
                                    style={{ borderColor: category.color }}
                                >
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hashtags Grid */}
                    <div className="hashtags-grid">
                        {filteredHashtags.map(hashtag => (
                            <div key={hashtag.id} className="hashtag-card">
                                <div className="hashtag-header">
                                    <span className="hashtag-text">{hashtag.hashtag}</span>
                                    <span className="hashtag-category">
                                        {getCategoryIcon(hashtag.category)} {hashtag.category}
                                    </span>
                                </div>
                                
                                <div className="hashtag-metrics">
                                    <div className="metric">
                                        <span className="metric-label">Popularity</span>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill popularity"
                                                style={{ width: `${hashtag.popularity_score * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{(hashtag.popularity_score * 100).toFixed(0)}%</span>
                                    </div>
                                    
                                    <div className="metric">
                                        <span className="metric-label">Competition</span>
                                        <span 
                                            className="competition-badge"
                                            style={{ backgroundColor: getCompetitionColor(hashtag.competition_level) }}
                                        >
                                            {hashtag.competition_level}
                                        </span>
                                    </div>
                                    
                                    <div className="metric">
                                        <span className="metric-label">Used</span>
                                        <span className="usage-count">{hashtag.usage_count} times</span>
                                    </div>
                                </div>
                                
                                <button 
                                    className="copy-hashtag-btn"
                                    onClick={() => copyHashtagsToClipboard([hashtag.hashtag])}
                                >
                                    📋 Copy
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'optimizer' && (
                <div className="optimizer-content">
                    <div className="optimizer-controls">
                        <h3>⚡ Hashtag Mix Optimizer</h3>
                        <p>Generate an optimized mix of hashtags for maximum reach and engagement</p>
                        
                        <div className="optimizer-settings">
                            <div className="setting-group">
                                <label>Target Hashtag Count:</label>
                                <input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(parseInt(e.target.value))}
                                    className="count-input"
                                />
                            </div>
                            
                            <div className="setting-group">
                                <label>Custom Keywords (comma-separated):</label>
                                <input
                                    type="text"
                                    placeholder="e.g., fitness, motivation, health"
                                    value={customKeywords}
                                    onChange={(e) => setCustomKeywords(e.target.value)}
                                    className="keywords-input"
                                />
                            </div>
                            
                            <button 
                                className="generate-btn"
                                onClick={generateOptimizedMix}
                                disabled={loading}
                            >
                                {loading ? '⏳ Generating...' : '🎯 Generate Optimized Mix'}
                            </button>
                        </div>
                    </div>

                    {optimizedMix && (
                        <div className="optimized-results">
                            <div className="results-header">
                                <h4>🎯 Optimized Hashtag Mix</h4>
                                <div className="results-stats">
                                    <span className="stat">
                                        <strong>{optimizedMix.total_count}</strong> hashtags
                                    </span>
                                    <span className="stat">
                                        <strong>{optimizedMix.estimated_reach.toLocaleString()}</strong> estimated reach
                                    </span>
                                </div>
                            </div>

                            <div className="mix-strategy">
                                <h5>Mix Strategy:</h5>
                                <div className="strategy-breakdown">
                                    <span className="strategy-item broad">
                                        🌍 {optimizedMix.mix_strategy.broad} Broad
                                    </span>
                                    <span className="strategy-item niche">
                                        🎯 {optimizedMix.mix_strategy.niche} Niche
                                    </span>
                                    <span className="strategy-item micro">
                                        🔍 {optimizedMix.mix_strategy.micro} Micro
                                    </span>
                                    <span className="strategy-item trending">
                                        🔥 {optimizedMix.mix_strategy.trending} Trending
                                    </span>
                                </div>
                            </div>

                            <div className="optimized-hashtags">
                                <div className="hashtags-list">
                                    {optimizedMix.hashtags.map((hashtag, index) => (
                                        <span 
                                            key={index} 
                                            className={`optimized-hashtag ${hashtag.category}`}
                                        >
                                            {hashtag.hashtag}
                                        </span>
                                    ))}
                                </div>
                                
                                <div className="hashtag-actions">
                                    <button 
                                        className="copy-all-btn"
                                        onClick={() => copyHashtagsToClipboard(optimizedMix.hashtags.map(h => h.hashtag))}
                                    >
                                        📋 Copy All Hashtags
                                    </button>
                                    <button className="save-combination-btn">
                                        💾 Save This Combination
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'saved' && (
                <div className="saved-content">
                    <div className="saved-header">
                        <h3>💾 Saved Hashtag Sets</h3>
                        <button className="create-set-btn">
                            ➕ Create New Set
                        </button>
                    </div>

                    <div className="saved-combinations">
                        {savedCombinations.map(combination => (
                            <div key={combination.id} className="combination-card">
                                <div className="combination-header">
                                    <h4>{combination.name}</h4>
                                    {combination.is_favorite && <span className="favorite-star">⭐</span>}
                                </div>
                                
                                <p className="combination-description">{combination.description}</p>
                                
                                <div className="combination-hashtags">
                                    {combination.hashtags.slice(0, 8).map((hashtag, index) => (
                                        <span key={index} className="saved-hashtag">
                                            {hashtag}
                                        </span>
                                    ))}
                                    {combination.hashtags.length > 8 && (
                                        <span className="more-hashtags">
                                            +{combination.hashtags.length - 8} more
                                        </span>
                                    )}
                                </div>
                                
                                <div className="combination-meta">
                                    {combination.niche_name && (
                                        <span className="combination-niche">{combination.niche_name}</span>
                                    )}
                                    <span className="combination-usage">Used {combination.usage_count} times</span>
                                </div>
                                
                                <div className="combination-actions">
                                    <button 
                                        className="use-combination-btn"
                                        onClick={() => copyHashtagsToClipboard(combination.hashtags)}
                                    >
                                        📋 Copy Set
                                    </button>
                                    <button className="edit-combination-btn">✏️ Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HashtagResearch;
