import React, { useState } from 'react';
import NicheList from './NicheList';
import NicheForm from './NicheForm';
import '../styles/niche.css';

const App: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNicheCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Content Generator</h1>
      </header>
      <main>
        <div className="content">
          <NicheForm onNicheCreated={handleNicheCreated} />
          <NicheList key={refreshKey} />
        </div>
      </main>
    </div>
  );
};

export default App;