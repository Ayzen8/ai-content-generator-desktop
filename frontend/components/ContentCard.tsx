import React, { useState } from 'react';
import ApiService from '../services/api';

interface ContentCardProps {
  content: {
    id: number;
    niche_id: number;
    niche_name: string;
    tweet: string;
    instagram: string;
    hashtags: string;
    imagePrompt: string;
    status: string;
    created_at: string;
  };
  onContentUpdate: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, onContentUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      await ApiService.patch(`/api/content/${content.id}`, { status: newStatus });
      onContentUpdate();
    } catch (error) {
      console.error('Error updating content status:', error);
      alert('Failed to update content status');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const regenerateContent = async () => {
    setLoading(true);
    try {
      await ApiService.post('/api/generate-content', { niche_id: content.niche_id });
      onContentUpdate();
    } catch (error) {
      console.error('Error regenerating content:', error);
      alert('Failed to regenerate content');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'posted': return '#28a745';
      case 'deleted': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="content-card">
      <div className="content-header">
        <div className="content-meta">
          <h3>{content.niche_name}</h3>
          <span 
            className="status-badge" 
            style={{ backgroundColor: getStatusColor(content.status) }}
          >
            {content.status}
          </span>
        </div>
        <div className="content-date">
          {formatDate(content.created_at)}
        </div>
      </div>

      <div className="content-sections">
        {/* Tweet Section */}
        <div className="content-section">
          <div className="section-header">
            <h4>🐦 Tweet ({content.tweet.length}/280)</h4>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(content.tweet, 'tweet')}
              disabled={loading}
            >
              {copiedField === 'tweet' ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="content-text tweet-text">
            {content.tweet}
          </div>
        </div>

        {/* Instagram Section */}
        <div className="content-section">
          <div className="section-header">
            <h4>📸 Instagram Caption</h4>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(content.instagram, 'instagram')}
              disabled={loading}
            >
              {copiedField === 'instagram' ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="content-text instagram-text">
            {content.instagram}
          </div>
        </div>

        {/* Hashtags Section */}
        <div className="content-section">
          <div className="section-header">
            <h4>🏷️ Hashtags</h4>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(content.hashtags, 'hashtags')}
              disabled={loading}
            >
              {copiedField === 'hashtags' ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="content-text hashtags-text">
            {content.hashtags}
          </div>
        </div>

        {/* Image Prompt Section */}
        <div className="content-section">
          <div className="section-header">
            <h4>🎨 Image Prompt</h4>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(content.imagePrompt, 'imagePrompt')}
              disabled={loading}
            >
              {copiedField === 'imagePrompt' ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="content-text image-prompt-text">
            {content.imagePrompt}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="content-actions">
        {content.status === 'pending' && (
          <>
            <button 
              className="action-btn post-btn"
              onClick={() => updateStatus('posted')}
              disabled={loading}
            >
              ✅ Post
            </button>
            <button 
              className="action-btn delete-btn"
              onClick={() => updateStatus('deleted')}
              disabled={loading}
            >
              🗑️ Delete
            </button>
          </>
        )}
        
        <button 
          className="action-btn regenerate-btn"
          onClick={regenerateContent}
          disabled={loading}
        >
          {loading ? '⏳ Generating...' : '🔄 Regenerate'}
        </button>
      </div>
    </div>
  );
};

export default ContentCard;
