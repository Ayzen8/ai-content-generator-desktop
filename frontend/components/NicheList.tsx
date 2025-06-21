import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';

interface Niche {
  id: number;
  name: string;
  description: string;
  parentId: number | null;
  keywords: string;
  isActive: boolean;
}

const NicheList: React.FC = () => {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNiches();
  }, []);

  const loadNiches = async () => {
    try {
      const data = await ApiService.get('/api/niches');
      setNiches(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to load niches');
      console.error(err);
      setNiches([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading niches...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="niche-list">
      <h2>Niches</h2>
      <div className="niche-grid">
        {Array.isArray(niches) && niches.map(niche => (
          <div key={niche.id} className="niche-card">
            <h3>{niche.name}</h3>
            <p>{niche.description}</p>
            <div className="niche-tags">
              {niche.keywords && niche.keywords.split(',').map(keyword => (
                <span key={keyword.trim()} className="tag">
                  {keyword.trim()}
                </span>
              ))}
            </div>
            <div className="niche-status">
              Status: {niche.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        ))}
        {(!niches || niches.length === 0) && (
          <div className="no-niches">
            <p>No niches available. Create your first niche to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NicheList;
