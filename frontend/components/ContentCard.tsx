import React, { useState } from 'react';
import ApiService from '../services/api';
import SoundService from '../services/soundService';
import ContentQualityAnalyzer from './ContentQualityAnalyzer';

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
    posted_to_twitter?: boolean;
    posted_to_instagram?: boolean;
    twitter_post_id?: string;
    instagram_post_id?: string;
  };
  onContentUpdate: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, onContentUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showQualityAnalysis, setShowQualityAnalysis] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | null>(null);

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
      SoundService.playCopied(); // Play copy sound
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      SoundService.playError(); // Play error sound
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

  const postToTwitter = async () => {
    setPosting(true);
    try {
      const response = await ApiService.post('/api/twitter/post', {
        content: content.tweet,
        contentId: content.id
      });

      if (response.success) {
        SoundService.playPosted(); // Play success sound
        alert(`✅ Posted to X successfully!\nView at: ${response.url}`);
        onContentUpdate();
      } else {
        SoundService.playError(); // Play error sound
        alert(`❌ Failed to post to X: ${response.error}`);
      }
    } catch (error: any) {
      console.error('Error posting to Twitter:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      SoundService.playError(); // Play error sound
      alert(`❌ Failed to post to X: ${errorMessage}`);
    } finally {
      setPosting(false);
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
        {/* X Post Section */}
        <div className="content-section">
          <div className="section-header">
            <h4>𝕏 X Post ({content.tweet.length}/280)</h4>
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
              className="action-btn twitter-btn"
              onClick={postToTwitter}
              disabled={loading || posting || content.posted_to_twitter}
              title={content.posted_to_twitter ? 'Already posted to X' : 'Post to X (Twitter)'}
            >
              {posting ? '⏳ Posting...' : content.posted_to_twitter ? '✅ Posted to 𝕏' : '🐦 Post to 𝕏'}
            </button>
            <button
              className="action-btn post-btn"
              onClick={() => updateStatus('posted')}
              disabled={loading || posting}
            >
              ✅ Mark Posted
            </button>
            <button
              className="action-btn delete-btn"
              onClick={() => updateStatus('deleted')}
              disabled={loading || posting}
            >
              🗑️ Delete
            </button>
          </>
        )}

        {content.status === 'posted' && content.twitter_post_id && (
          <a
            href={`https://twitter.com/i/web/status/${content.twitter_post_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn view-btn"
          >
            👁️ View on 𝕏
          </a>
        )}

        <button
          className="action-btn regenerate-btn"
          onClick={regenerateContent}
          disabled={loading || posting}
        >
          {loading ? '⏳ Generating...' : '🔄 Regenerate'}
        </button>

        <button
          className="action-btn quality-btn"
          onClick={() => setShowQualityAnalysis(!showQualityAnalysis)}
          disabled={loading || posting}
        >
          {qualityScore ? `📊 Quality: ${qualityScore}` : '📊 Analyze Quality'}
        </button>
      </div>

      {/* Quality Analysis Section */}
      {showQualityAnalysis && (
        <div className="quality-analysis-section">
          <ContentQualityAnalyzer
            content={{
              tweet: content.tweet,
              instagram: content.instagram,
              hashtags: content.hashtags,
              imagePrompt: content.imagePrompt
            }}
            nicheId={content.niche_id}
            onAnalysisComplete={(analysis) => {
              setQualityScore(analysis.overallScore);
              SoundService.playSuccess();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ContentCard;
