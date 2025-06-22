import React from 'react';
import { withLazyLoading, withLoadingMetrics } from '../utils/lazyLoad';

// Lazy load heavy components to reduce initial bundle size
export const LazyAdvancedAnalyticsDashboard = withLazyLoading(
    React.lazy(() => import('./AdvancedAnalyticsDashboard').then(module => ({
        default: withLoadingMetrics(module.default, 'AdvancedAnalyticsDashboard')
    })))
);

export const LazyCustomNicheCreator = withLazyLoading(
    React.lazy(() => import('./CustomNicheCreator').then(module => ({
        default: withLoadingMetrics(module.default, 'CustomNicheCreator')
    })))
);

export const LazyContentOptimizer = withLazyLoading(
    React.lazy(() => import('./ContentOptimizer').then(module => ({
        default: withLoadingMetrics(module.default, 'ContentOptimizer')
    })))
);

export const LazySystemDashboard = withLazyLoading(
    React.lazy(() => import('./SystemDashboard').then(module => ({
        default: withLoadingMetrics(module.default, 'SystemDashboard')
    })))
);

export const LazyGrowthBot = withLazyLoading(
    React.lazy(() => import('./GrowthBot').then(module => ({
        default: withLoadingMetrics(module.default, 'GrowthBot')
    })))
);

export const LazyContentTemplates = withLazyLoading(
    React.lazy(() => import('./ContentTemplates').then(module => ({
        default: withLoadingMetrics(module.default, 'ContentTemplates')
    })))
);

export const LazyHashtagResearch = withLazyLoading(
    React.lazy(() => import('./HashtagResearch').then(module => ({
        default: withLoadingMetrics(module.default, 'HashtagResearch')
    })))
);

export const LazySettings = withLazyLoading(
    React.lazy(() => import('./Settings').then(module => ({
        default: withLoadingMetrics(module.default, 'Settings')
    })))
);

// Lightweight fallback components for better UX
export const AnalyticsFallback = () => (
    <div className="analytics-fallback">
        <div className="fallback-header">
            <h2>📊 Loading Analytics...</h2>
            <p>Preparing advanced analytics dashboard</p>
        </div>
        <div className="fallback-skeleton">
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
        </div>
    </div>
);

export const DashboardFallback = () => (
    <div className="dashboard-fallback">
        <div className="fallback-header">
            <h2>🔧 Loading Dashboard...</h2>
            <p>Initializing system monitoring</p>
        </div>
        <div className="fallback-grid">
            <div className="skeleton-metric"></div>
            <div className="skeleton-metric"></div>
            <div className="skeleton-metric"></div>
            <div className="skeleton-metric"></div>
        </div>
    </div>
);

export const CreatorFallback = () => (
    <div className="creator-fallback">
        <div className="fallback-header">
            <h2>🎯 Loading Creator...</h2>
            <p>Preparing AI-enhanced niche creation</p>
        </div>
        <div className="fallback-form">
            <div className="skeleton-input"></div>
            <div className="skeleton-textarea"></div>
            <div className="skeleton-button"></div>
        </div>
    </div>
);



// Enhanced lazy components with custom fallbacks
export const LazyAdvancedAnalyticsWithFallback = withLazyLoading(
    React.lazy(() => import('./AdvancedAnalyticsDashboard')),
    AnalyticsFallback
);

export const LazySystemDashboardWithFallback = withLazyLoading(
    React.lazy(() => import('./SystemDashboard')),
    DashboardFallback
);

export const LazyCustomNicheCreatorWithFallback = withLazyLoading(
    React.lazy(() => import('./CustomNicheCreator')),
    CreatorFallback
);
