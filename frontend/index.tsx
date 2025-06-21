import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard';
import { EnhancedThemeProvider, ThemeCustomizer } from './components/EnhancedThemeProvider';
import { AnimationProvider } from './components/AnimationProvider';
import PerformanceMonitor from './components/PerformanceMonitor';
import './styles/index.css';
import './styles/enhanced-ui.css';
import './styles/dashboard.css';
import './styles/niche.css';
import './styles/content.css';
import './styles/history.css';
import './styles/analytics.css';
import './styles/settings.css';

const App: React.FC = () => {
    return (
        <EnhancedThemeProvider>
            <AnimationProvider>
                <div className="app">
                    <Dashboard />
                    <ThemeCustomizer />
                    <PerformanceMonitor enabled={true} />
                </div>
            </AnimationProvider>
        </EnhancedThemeProvider>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error('Root element not found');
}