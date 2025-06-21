import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import SoundService from '../services/soundService';
import ContentCard from './ContentCard';

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
  posted_to_twitter?: boolean;
  posted_to_instagram?: boolean;
  twitter_post_id?: string;
  instagram_post_id?: string;
}

interface Niche {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
}

const ContentHistory: React.FC = () => {
  const [content, setContent] = useState<Content[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nicheFilter, setNicheFilter] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    loadContent();
    loadNiches();
  }, [statusFilter, nicheFilter, dateFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter, nicheFilter, dateFilter]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (nicheFilter) {
        params.append('niche_id', nicheFilter.toString());
      }
      
      const response = await ApiService.get(`/api/content?${params.toString()}`);
      setContent(response);
    } catch (error) {
      console.error('Error loading content:', error);
      SoundService.playError();
    } finally {
      setLoading(false);
    }
  };

  const loadNiches = async () => {
    try {
      const response = await ApiService.get('/api/niches');
      setNiches(response);
    } catch (error) {
      console.error('Error loading niches:', error);
    }
  };

  const getFilteredContent = () => {
    if (!Array.isArray(content)) return [];
    let filtered = [...content];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.tweet.toLowerCase().includes(term) ||
        item.instagram.toLowerCase().includes(term) ||
        item.hashtags.toLowerCase().includes(term) ||
        item.niche_name.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(item => 
        new Date(item.created_at) >= filterDate
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'niche':
          return a.niche_name.localeCompare(b.niche_name);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getPaginatedContent = () => {
    const filtered = getFilteredContent();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filtered.slice(startIndex, endIndex),
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    };
  };

  const getContentStats = () => {
    const filtered = getFilteredContent();
    if (!Array.isArray(filtered)) {
      return { pending: 0, posted: 0, deleted: 0, total: 0 };
    }
    const pending = filtered.filter(c => c.status === 'pending').length;
    const posted = filtered.filter(c => c.status === 'posted').length;
    const deleted = filtered.filter(c => c.status === 'deleted').length;

    return { pending, posted, deleted, total: filtered.length };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setNicheFilter(null);
    setDateFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
    SoundService.playCopied();
  };

  const exportContent = () => {
    const filtered = getFilteredContent();
    const csvContent = [
      ['Date', 'Niche', 'Status', 'X Post', 'Instagram Caption', 'Hashtags'].join(','),
      ...filtered.map(item => [
        new Date(item.created_at).toLocaleDateString(),
        item.niche_name,
        item.status,
        `"${item.tweet.replace(/"/g, '""')}"`,
        `"${item.instagram.replace(/"/g, '""')}"`,
        `"${item.hashtags.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    SoundService.playSuccess();
  };

  const { items, totalItems, totalPages } = getPaginatedContent();
  const stats = getContentStats();

  return (
    <div className="content-history">
      <div className="history-header">
        <div className="header-title">
          <h2>📚 Content History</h2>
          <p>View and manage all your generated content</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="export-btn"
            onClick={exportContent}
            disabled={totalItems === 0}
            title="Export filtered content to CSV"
          >
            📊 Export
          </button>
          <button 
            className="clear-filters-btn"
            onClick={clearFilters}
            title="Clear all filters"
          >
            🔄 Clear Filters
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="content-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card posted">
          <span className="stat-number">{stats.posted}</span>
          <span className="stat-label">Posted</span>
        </div>
        <div className="stat-card deleted">
          <span className="stat-number">{stats.deleted}</span>
          <span className="stat-label">Deleted</span>
        </div>
      </div>

      {/* Filters */}
      <div className="content-filters">
        <div className="filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="posted">Posted</option>
            <option value="deleted">Deleted</option>
          </select>
          
          <select
            value={nicheFilter || ''}
            onChange={(e) => setNicheFilter(Number(e.target.value) || null)}
            className="filter-select"
          >
            <option value="">All Niches</option>
            {niches
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(niche => (
                <option key={niche.id} value={niche.id}>
                  {niche.name}
                </option>
              ))
            }
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="niche">By Niche</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {loading ? (
          <div className="loading-message">
            ⏳ Loading content history...
          </div>
        ) : items.length === 0 ? (
          <div className="empty-message">
            <h3>No content found</h3>
            <p>
              {searchTerm || statusFilter !== 'all' || nicheFilter || dateFilter !== 'all'
                ? 'Try adjusting your filters to see more content.'
                : 'Start generating content to build your history!'
              }
            </p>
          </div>
        ) : (
          items.map(item => (
            <ContentCard 
              key={item.id}
              content={item}
              onContentUpdate={loadContent}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages} ({totalItems} items)
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentHistory;
