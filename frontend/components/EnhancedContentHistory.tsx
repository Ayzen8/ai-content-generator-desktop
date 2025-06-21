import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface ContentItem {
    id: string;
    content: string;
    type: string;
    niche_name: string;
    created_at: string;
    status: string;
    engagement_score?: number;
    hashtags?: string;
}

interface FilterOptions {
    search: string;
    niche: string;
    platform: string;
    status: string;
    dateRange: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

const EnhancedContentHistory: React.FC = () => {
    const [content, setContent] = useState<ContentItem[]>([]);
    const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [niches, setNiches] = useState<any[]>([]);
    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        niche: 'all',
        platform: 'all',
        status: 'all',
        dateRange: '30d',
        sortBy: 'created_at',
        sortOrder: 'desc'
    });

    useEffect(() => {
        loadContent();
        loadNiches();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [content, filters]);

    const loadContent = async () => {
        setLoading(true);
        try {
            const response = await ApiService.get('/api/content?limit=500');
            setContent(response);
        } catch (error) {
            console.error('Failed to load content:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadNiches = async () => {
        try {
            const response = await ApiService.get('/api/niches');
            setNiches(response);
        } catch (error) {
            console.error('Failed to load niches:', error);
        }
    };

    const applyFilters = () => {
        let filtered = [...content];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(item => 
                item.content.toLowerCase().includes(searchLower) ||
                item.niche_name?.toLowerCase().includes(searchLower) ||
                item.hashtags?.toLowerCase().includes(searchLower)
            );
        }

        // Niche filter
        if (filters.niche !== 'all') {
            filtered = filtered.filter(item => item.niche_name === filters.niche);
        }

        // Platform filter
        if (filters.platform !== 'all') {
            filtered = filtered.filter(item => item.type.includes(filters.platform));
        }

        // Status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(item => item.status === filters.status);
        }

        // Date range filter
        if (filters.dateRange !== 'all') {
            const now = new Date();
            let cutoffDate = new Date();
            
            switch (filters.dateRange) {
                case '7d': cutoffDate.setDate(now.getDate() - 7); break;
                case '30d': cutoffDate.setDate(now.getDate() - 30); break;
                case '90d': cutoffDate.setDate(now.getDate() - 90); break;
                case '1y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
            }
            
            filtered = filtered.filter(item => new Date(item.created_at) >= cutoffDate);
        }

        // Sort
        filtered.sort((a, b) => {
            let aValue: any = a[filters.sortBy as keyof ContentItem];
            let bValue: any = b[filters.sortBy as keyof ContentItem];

            if (filters.sortBy === 'created_at') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            if (filters.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredContent(filtered);
    };

    const updateFilter = (key: keyof FilterOptions, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const exportContent = async (format: 'csv' | 'json') => {
        try {
            const dataToExport = filteredContent.map(item => ({
                content: item.content,
                niche: item.niche_name,
                platform: item.type,
                status: item.status,
                created_at: item.created_at,
                engagement_score: item.engagement_score || 0
            }));

            if (format === 'csv') {
                const csv = [
                    'Content,Niche,Platform,Status,Created At,Engagement Score',
                    ...dataToExport.map(item => 
                        `"${item.content.replace(/"/g, '""')}","${item.niche}","${item.platform}","${item.status}","${item.created_at}","${item.engagement_score}"`
                    )
                ].join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `content-export-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const json = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `content-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            niche: 'all',
            platform: 'all',
            status: 'all',
            dateRange: '30d',
            sortBy: 'created_at',
            sortOrder: 'desc'
        });
    };

    if (loading) {
        return (
            <div className="enhanced-content-history loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading content history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="enhanced-content-history">
            <div className="history-header">
                <h2>📚 Enhanced Content History</h2>
                <div className="header-stats">
                    <span className="stat">
                        <strong>{filteredContent.length}</strong> of <strong>{content.length}</strong> items
                    </span>
                </div>
            </div>

            <div className="filters-section">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>🔍 Search:</label>
                        <input
                            type="text"
                            placeholder="Search content, niches, hashtags..."
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-group">
                        <label>🎯 Niche:</label>
                        <select
                            value={filters.niche}
                            onChange={(e) => updateFilter('niche', e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Niches</option>
                            {niches.map(niche => (
                                <option key={niche.id} value={niche.name}>
                                    {niche.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>📱 Platform:</label>
                        <select
                            value={filters.platform}
                            onChange={(e) => updateFilter('platform', e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Platforms</option>
                            <option value="twitter">Twitter/X</option>
                            <option value="instagram">Instagram</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>📊 Status:</label>
                        <select
                            value={filters.status}
                            onChange={(e) => updateFilter('status', e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="posted">Posted</option>
                            <option value="scheduled">Scheduled</option>
                        </select>
                    </div>
                </div>

                <div className="filters-row">
                    <div className="filter-group">
                        <label>📅 Date Range:</label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => updateFilter('dateRange', e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Time</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="1y">Last year</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>🔄 Sort By:</label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => updateFilter('sortBy', e.target.value)}
                            className="filter-select"
                        >
                            <option value="created_at">Date Created</option>
                            <option value="content">Content</option>
                            <option value="niche_name">Niche</option>
                            <option value="type">Platform</option>
                            <option value="engagement_score">Engagement</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>📈 Order:</label>
                        <select
                            value={filters.sortOrder}
                            onChange={(e) => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
                            className="filter-select"
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>

                    <div className="filter-actions">
                        <button onClick={clearFilters} className="btn btn-secondary">
                            🗑️ Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="export-section">
                <div className="export-actions">
                    <button onClick={() => exportContent('csv')} className="btn btn-primary">
                        📊 Export CSV
                    </button>
                    <button onClick={() => exportContent('json')} className="btn btn-secondary">
                        📄 Export JSON
                    </button>
                    <button onClick={loadContent} className="btn btn-secondary">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="content-grid">
                {filteredContent.length === 0 ? (
                    <div className="no-content">
                        <div className="no-content-icon">📭</div>
                        <h3>No content found</h3>
                        <p>Try adjusting your filters or create some content first.</p>
                    </div>
                ) : (
                    filteredContent.map(item => (
                        <div key={item.id} className="content-item-enhanced">
                            <div className="content-header">
                                <div className="content-meta">
                                    <span className="content-niche">{item.niche_name}</span>
                                    <span className="content-platform">{item.type}</span>
                                    <span className={`content-status ${item.status}`}>{item.status}</span>
                                </div>
                                <div className="content-date">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <div className="content-body">
                                <p className="content-text">{item.content}</p>
                                {item.hashtags && (
                                    <div className="content-hashtags">
                                        {item.hashtags.split(' ').map((tag, index) => (
                                            <span key={index} className="hashtag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="content-footer">
                                <div className="content-engagement">
                                    {item.engagement_score && (
                                        <span className="engagement-score">
                                            📈 {item.engagement_score} engagement
                                        </span>
                                    )}
                                </div>
                                <div className="content-actions">
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(item.content)}
                                        className="btn btn-small"
                                        title="Copy content"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EnhancedContentHistory;
