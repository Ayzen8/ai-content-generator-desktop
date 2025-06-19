import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard';
import './styles/index.css';
import './styles/dashboard.css';
import './styles/niche.css';
import './styles/content.css';

const App: React.FC = () => {
    return (
        <div className="app">
            <Dashboard />
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error('Root element not found');
}