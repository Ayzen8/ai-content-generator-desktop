import React, { Suspense, ComponentType } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<T extends Record<string, any>>(
    Component: React.LazyExoticComponent<ComponentType<T>>,
    fallback?: React.ComponentType
) {
    const LazyComponent = (props: T) => {
        const FallbackComponent = fallback || (() => (
            <div className="lazy-loading-container">
                <LoadingSpinner text="Loading component..." />
            </div>
        ));

        return (
            <Suspense fallback={<FallbackComponent />}>
                <Component {...(props as any)} />
            </Suspense>
        );
    };

    LazyComponent.displayName = `LazyLoaded(Component)`;
    return LazyComponent;
}

// Error boundary for lazy loaded components
interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class LazyLoadErrorBoundary extends React.Component<
    React.PropsWithChildren<{}>,
    ErrorBoundaryState
> {
    constructor(props: React.PropsWithChildren<{}>) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Lazy loading error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="lazy-load-error">
                    <h3>⚠️ Component Loading Error</h3>
                    <p>Failed to load component. Please refresh the page.</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        className="retry-btn"
                    >
                        🔄 Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Preload utility for critical components
export const preloadComponent = (componentImport: () => Promise<any>) => {
    const componentPromise = componentImport();
    return componentPromise;
};

// Route-based code splitting helper
export const createLazyRoute = (importFn: () => Promise<any>) => {
    const LazyComponent = React.lazy(importFn);
    return withLazyLoading(LazyComponent);
};

// Performance monitoring for lazy loads
export const withLoadingMetrics = <T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    componentName: string
) => {
    return (props: T) => {
        React.useEffect(() => {
            const startTime = performance.now();

            return () => {
                const loadTime = performance.now() - startTime;
                console.log(`📊 ${componentName} load time: ${loadTime.toFixed(2)}ms`);

                // Send to performance monitoring if available
                if (window.performance && window.performance.mark) {
                    window.performance.mark(`${componentName}-loaded`);
                }
            };
        }, []);

        return <Component {...(props as any)} />;
    };
};
