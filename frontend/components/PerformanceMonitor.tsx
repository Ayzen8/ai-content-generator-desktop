import React, { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
    fps: number;
    memoryUsage: number;
    loadTime: number;
    apiResponseTime: number;
    renderTime: number;
    bundleSize: number;
}

interface PerformanceMonitorProps {
    enabled?: boolean;
    showInProduction?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
    enabled = true,
    showInProduction = false
}) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 0,
        memoryUsage: 0,
        loadTime: 0,
        apiResponseTime: 0,
        renderTime: 0,
        bundleSize: 0
    });
    const [isVisible, setIsVisible] = useState(false);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());
    const renderStartTime = useRef(0);

    // Check if we should show the monitor
    const shouldShow = enabled && (process.env.NODE_ENV === 'development' || showInProduction);

    useEffect(() => {
        if (!shouldShow) return;

        // Initialize performance monitoring
        measureInitialLoad();
        startFPSMonitoring();
        startMemoryMonitoring();
        measureBundleSize();

        // Keyboard shortcut to toggle visibility
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                setIsVisible(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [shouldShow]);

    const measureInitialLoad = () => {
        if (performance.timing) {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            setMetrics(prev => ({ ...prev, loadTime }));
        }
    };

    const startFPSMonitoring = () => {
        const measureFPS = () => {
            frameCount.current++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime.current + 1000) {
                const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
                setMetrics(prev => ({ ...prev, fps }));
                frameCount.current = 0;
                lastTime.current = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    };

    const startMemoryMonitoring = () => {
        const measureMemory = () => {
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                setMetrics(prev => ({ ...prev, memoryUsage }));
            }
        };

        measureMemory();
        const interval = setInterval(measureMemory, 2000);
        return () => clearInterval(interval);
    };

    const measureBundleSize = async () => {
        try {
            // Estimate bundle size based on loaded scripts
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            let totalSize = 0;

            for (const script of scripts) {
                try {
                    const response = await fetch((script as HTMLScriptElement).src, { method: 'HEAD' });
                    const size = response.headers.get('content-length');
                    if (size) {
                        totalSize += parseInt(size);
                    }
                } catch (error) {
                    // Ignore errors for cross-origin scripts
                }
            }

            const bundleSize = Math.round(totalSize / 1024); // KB
            setMetrics(prev => ({ ...prev, bundleSize }));
        } catch (error) {
            console.warn('Could not measure bundle size:', error);
        }
    };

    // Hook for measuring API response times
    const measureApiResponse = (responseTime: number) => {
        setMetrics(prev => ({ ...prev, apiResponseTime: responseTime }));
    };

    // Hook for measuring render times
    const measureRenderTime = () => {
        renderStartTime.current = performance.now();
        
        return () => {
            const renderTime = performance.now() - renderStartTime.current;
            setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime) }));
        };
    };

    const getMetricStatus = (metric: keyof PerformanceMetrics, value: number) => {
        const thresholds = {
            fps: { warning: 30, error: 15 },
            memoryUsage: { warning: 100, error: 200 },
            loadTime: { warning: 3000, error: 5000 },
            apiResponseTime: { warning: 1000, error: 3000 },
            renderTime: { warning: 16, error: 33 },
            bundleSize: { warning: 1000, error: 2000 }
        };

        const threshold = thresholds[metric];
        if (value >= threshold.error) return 'error';
        if (value >= threshold.warning) return 'warning';
        return 'good';
    };

    const formatValue = (metric: keyof PerformanceMetrics, value: number) => {
        switch (metric) {
            case 'fps':
                return `${value} FPS`;
            case 'memoryUsage':
                return `${value} MB`;
            case 'loadTime':
                return `${(value / 1000).toFixed(1)}s`;
            case 'apiResponseTime':
                return `${value}ms`;
            case 'renderTime':
                return `${value}ms`;
            case 'bundleSize':
                return `${value} KB`;
            default:
                return `${value}`;
        }
    };

    const getRecommendations = () => {
        const recommendations = [];

        if (metrics.fps < 30) {
            recommendations.push('Low FPS detected. Consider reducing animations or optimizing renders.');
        }
        if (metrics.memoryUsage > 100) {
            recommendations.push('High memory usage. Check for memory leaks or large objects.');
        }
        if (metrics.loadTime > 3000) {
            recommendations.push('Slow load time. Consider code splitting or optimizing assets.');
        }
        if (metrics.apiResponseTime > 1000) {
            recommendations.push('Slow API responses. Consider caching or optimizing backend.');
        }
        if (metrics.renderTime > 16) {
            recommendations.push('Slow renders detected. Consider memoization or virtual scrolling.');
        }
        if (metrics.bundleSize > 1000) {
            recommendations.push('Large bundle size. Consider code splitting or tree shaking.');
        }

        return recommendations;
    };

    // Expose measurement functions globally for use in other components
    useEffect(() => {
        if (shouldShow) {
            (window as any).performanceMonitor = {
                measureApiResponse,
                measureRenderTime
            };
        }
    }, [shouldShow]);

    if (!shouldShow || !isVisible) {
        return shouldShow ? (
            <div 
                className="performance-monitor-toggle"
                onClick={() => setIsVisible(true)}
                title="Show Performance Monitor (Ctrl+Shift+P)"
            >
                📊
            </div>
        ) : null;
    }

    const recommendations = getRecommendations();

    return (
        <div className="performance-monitor">
            <div className="performance-header">
                <span>⚡ Performance Monitor</span>
                <button 
                    className="minimize-btn"
                    onClick={() => setIsVisible(false)}
                    title="Hide (Ctrl+Shift+P)"
                >
                    ─
                </button>
            </div>

            <div className="performance-metrics">
                {Object.entries(metrics).map(([key, value]) => (
                    <div key={key} className="performance-metric">
                        <span className="metric-label">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </span>
                        <span className={`metric-value ${getMetricStatus(key as keyof PerformanceMetrics, value)}`}>
                            {formatValue(key as keyof PerformanceMetrics, value)}
                        </span>
                    </div>
                ))}
            </div>

            {recommendations.length > 0 && (
                <div className="performance-recommendations">
                    <div className="recommendations-header">💡 Recommendations:</div>
                    {recommendations.map((rec, index) => (
                        <div key={index} className="recommendation">
                            • {rec}
                        </div>
                    ))}
                </div>
            )}

            <div className="performance-footer">
                <small>Press Ctrl+Shift+P to toggle</small>
            </div>
        </div>
    );
};

// Performance Hook for components
export const usePerformanceTracking = (componentName: string) => {
    const renderStartTime = useRef<number>(0);

    useEffect(() => {
        renderStartTime.current = performance.now();
        
        return () => {
            const renderTime = performance.now() - renderStartTime.current;
            if (renderTime > 16) { // More than one frame
                console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
            }
        };
    });

    const trackApiCall = async <T,>(apiCall: Promise<T>, endpoint: string): Promise<T> => {
        const startTime = performance.now();
        try {
            const result = await apiCall;
            const responseTime = performance.now() - startTime;
            
            if ((window as any).performanceMonitor) {
                (window as any).performanceMonitor.measureApiResponse(responseTime);
            }
            
            if (responseTime > 1000) {
                console.warn(`Slow API call to ${endpoint}: ${responseTime.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            const responseTime = performance.now() - startTime;
            console.error(`Failed API call to ${endpoint} after ${responseTime.toFixed(2)}ms:`, error);
            throw error;
        }
    };

    return { trackApiCall };
};

export default PerformanceMonitor;
