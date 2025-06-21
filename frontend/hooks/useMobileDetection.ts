import { useState, useEffect } from 'react';

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  orientation: 'portrait' | 'landscape';
}

export const useMobileDetection = (): MobileDetection => {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenSize: 'large',
    orientation: 'landscape'
  });

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Screen size detection
      let screenSize: 'small' | 'medium' | 'large' | 'xlarge';
      if (width < 480) {
        screenSize = 'small';
      } else if (width < 768) {
        screenSize = 'medium';
      } else if (width < 1200) {
        screenSize = 'large';
      } else {
        screenSize = 'xlarge';
      }

      // Device type detection
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;

      // Touch device detection
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 ||
                           (navigator as any).msMaxTouchPoints > 0;

      // Orientation detection
      const orientation = height > width ? 'portrait' : 'landscape';

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenSize,
        orientation
      });
    };

    // Initial detection
    updateDetection();

    // Listen for resize events
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return detection;
};

// Hook for responsive breakpoints
export const useBreakpoint = () => {
  const { screenSize } = useMobileDetection();
  
  return {
    isSmall: screenSize === 'small',
    isMedium: screenSize === 'medium',
    isLarge: screenSize === 'large',
    isXLarge: screenSize === 'xlarge',
    isMobileOrTablet: screenSize === 'small' || screenSize === 'medium',
    isTabletOrDesktop: screenSize === 'medium' || screenSize === 'large' || screenSize === 'xlarge'
  };
};

// Hook for touch gestures
export const useTouchGestures = (element: React.RefObject<HTMLElement>) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
      });
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = touchStart.y - touchEnd.y;
      const isLeftSwipe = distanceX > 50;
      const isRightSwipe = distanceX < -50;
      const isUpSwipe = distanceY > 50;
      const isDownSwipe = distanceY < -50;

      // Dispatch custom events for swipe gestures
      if (isLeftSwipe) {
        el.dispatchEvent(new CustomEvent('swipeLeft'));
      }
      if (isRightSwipe) {
        el.dispatchEvent(new CustomEvent('swipeRight'));
      }
      if (isUpSwipe) {
        el.dispatchEvent(new CustomEvent('swipeUp'));
      }
      if (isDownSwipe) {
        el.dispatchEvent(new CustomEvent('swipeDown'));
      }
    };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove);
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, touchStart, touchEnd]);

  return {
    touchStart,
    touchEnd
  };
};

export default useMobileDetection;
