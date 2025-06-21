import React, { useState, useEffect } from 'react';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface MobileOptimizedDashboardProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    children: React.ReactNode;
}

const MobileOptimizedDashboard: React.FC<MobileOptimizedDashboardProps> = ({
    activeTab,
    setActiveTab,
    children
}) => {
    const { isMobile, isTablet, screenSize } = useMobileDetection();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'content', label: 'Generator', icon: '🤖' },
        { id: 'variations', label: 'Styles', icon: '🎨' },
        { id: 'history', label: 'History', icon: '📚' },
        { id: 'templates', label: 'Templates', icon: '📝' },
        { id: 'hashtags', label: 'Hashtags', icon: '🔍' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'advanced-analytics', label: 'Advanced', icon: '📊' },
        { id: 'niches', label: 'Niches', icon: '🎯' },
        { id: 'growth-bot', label: 'Growth Bot', icon: '🤖' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        if (isMobile) {
            setIsCollapsed(true);
        }
    }, [isMobile]);

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
        if (isMobile) {
            setShowMobileMenu(false);
        }
    };

    const getActiveTabInfo = () => {
        return tabs.find(tab => tab.id === activeTab) || tabs[0];
    };

    if (isMobile) {
        return (
            <div className="mobile-dashboard">
                {/* Mobile Header */}
                <div className="mobile-header">
                    <div className="mobile-header-content">
                        <button 
                            className="mobile-menu-btn"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            <span className="hamburger-icon">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </button>
                        
                        <div className="mobile-title">
                            <span className="mobile-tab-icon">{getActiveTabInfo().icon}</span>
                            <span className="mobile-tab-label">{getActiveTabInfo().label}</span>
                        </div>
                        
                        <div className="mobile-header-actions">
                            <button className="mobile-action-btn">
                                🔔
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Overlay */}
                {showMobileMenu && (
                    <div className="mobile-nav-overlay">
                        <div className="mobile-nav-content">
                            <div className="mobile-nav-header">
                                <h3>🚀 AI Content Generator</h3>
                                <button 
                                    className="mobile-nav-close"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="mobile-nav-tabs">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`mobile-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => handleTabClick(tab.id)}
                                    >
                                        <span className="mobile-nav-icon">{tab.icon}</span>
                                        <span className="mobile-nav-label">{tab.label}</span>
                                        {activeTab === tab.id && (
                                            <span className="mobile-nav-indicator">●</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Content */}
                <div className="mobile-content">
                    {children}
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="mobile-bottom-nav">
                    {tabs.slice(0, 5).map(tab => (
                        <button
                            key={tab.id}
                            className={`mobile-bottom-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabClick(tab.id)}
                        >
                            <span className="bottom-tab-icon">{tab.icon}</span>
                            <span className="bottom-tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`desktop-dashboard ${isTablet ? 'tablet' : ''}`}>
            {/* Desktop/Tablet Sidebar */}
            <div className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        {isCollapsed ? '🚀' : '🚀 AI Content Generator'}
                    </div>
                    <button 
                        className="sidebar-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? '→' : '←'}
                    </button>
                </div>
                
                <div className="sidebar-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabClick(tab.id)}
                            title={isCollapsed ? tab.label : ''}
                        >
                            <span className="sidebar-tab-icon">{tab.icon}</span>
                            {!isCollapsed && (
                                <span className="sidebar-tab-label">{tab.label}</span>
                            )}
                            {activeTab === tab.id && (
                                <span className="sidebar-tab-indicator"></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop/Tablet Content */}
            <div className="dashboard-main">
                <div className="dashboard-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MobileOptimizedDashboard;
