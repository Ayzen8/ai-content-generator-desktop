import React, { useState } from 'react';
import { ApiService } from '../services/api';

interface NicheFormProps {
  onNicheCreated: () => void;
}

const NicheForm: React.FC<NicheFormProps> = ({ onNicheCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [persona, setPersona] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await ApiService.post('/api/niches', {
        name,
        description,
        persona,
        keywords
      });

      // Reset form
      setName('');
      setDescription('');
      setPersona('');
      setKeywords('');
      
      // Notify parent component
      onNicheCreated();
    } catch (err) {
      setError('Failed to create niche');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="niche-form">
      <h3>Add New Niche</h3>
      {error && <div className="error">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          placeholder="Brief description of this niche..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="persona">Content Persona:</label>
        <textarea
          id="persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          disabled={loading}
          placeholder="Describe the voice, tone, and style for content in this niche. E.g., 'Professional financial advisor with a friendly, educational tone. Uses data-driven insights and avoids overly technical jargon.'"
          rows={4}
        />
      </div>

      <div className="form-group">
        <label htmlFor="keywords">Keywords (comma-separated):</label>
        <input
          type="text"
          id="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          disabled={loading}
          placeholder="investing, stocks, finance, wealth building..."
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Niche'}
      </button>
    </form>
  );
};

export default NicheForm;
