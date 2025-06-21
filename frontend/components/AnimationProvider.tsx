import React, { createContext, useContext, useEffect, useState } from 'react';

interface AnimationContextType {
    playAnimation: (element: HTMLElement, animation: string, duration?: number) => Promise<void>;
    addHoverEffect: (element: HTMLElement, effect: string) => void;
    removeHoverEffect: (element: HTMLElement) => void;
    createParticleEffect: (x: number, y: number, type: string) => void;
    isAnimating: boolean;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimation = () => {
    const context = useContext(AnimationContext);
    if (!context) {
        throw new Error('useAnimation must be used within an AnimationProvider');
    }
    return context;
};

interface AnimationProviderProps {
    children: React.ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const playAnimation = async (element: HTMLElement, animation: string, duration = 300): Promise<void> => {
        return new Promise((resolve) => {
            setIsAnimating(true);
            
            element.style.animation = `${animation} ${duration}ms ease-out`;
            
            const handleAnimationEnd = () => {
                element.style.animation = '';
                element.removeEventListener('animationend', handleAnimationEnd);
                setIsAnimating(false);
                resolve();
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
        });
    };

    const addHoverEffect = (element: HTMLElement, effect: string) => {
        element.classList.add(`hover-${effect}`);
    };

    const removeHoverEffect = (element: HTMLElement) => {
        element.className = element.className.replace(/hover-\w+/g, '');
    };

    const createParticleEffect = (x: number, y: number, type: string) => {
        const particle = document.createElement('div');
        particle.className = `particle particle-${type}`;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1000);
    };

    return (
        <AnimationContext.Provider value={{
            playAnimation,
            addHoverEffect,
            removeHoverEffect,
            createParticleEffect,
            isAnimating
        }}>
            {children}
        </AnimationContext.Provider>
    );
};

// Enhanced Button Component with Animations
interface AnimatedButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    className?: string;
    ripple?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
    children,
    onClick,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    icon,
    className = '',
    ripple = true
}) => {
    const { playAnimation, createParticleEffect } = useAnimation();
    const [isPressed, setIsPressed] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;

        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        
        // Create ripple effect
        if (ripple) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            createRipple(button, x, y);
        }

        // Play click animation
        setIsPressed(true);
        await playAnimation(button, 'buttonPress', 150);
        setIsPressed(false);

        // Create particle effect for success actions
        if (variant === 'success') {
            createParticleEffect(e.clientX, e.clientY, 'success');
        }

        if (onClick) {
            onClick();
        }
    };

    const createRipple = (button: HTMLElement, x: number, y: number) => {
        const ripple = document.createElement('span');
        const size = Math.max(button.offsetWidth, button.offsetHeight);
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x - size / 2}px`;
        ripple.style.top = `${y - size / 2}px`;
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    };

    return (
        <button
            className={`animated-btn animated-btn-${variant} animated-btn-${size} ${className} ${isPressed ? 'pressed' : ''} ${loading ? 'loading' : ''}`}
            onClick={handleClick}
            disabled={disabled || loading}
        >
            {loading && <div className="btn-spinner"></div>}
            {icon && <span className="btn-icon">{icon}</span>}
            <span className="btn-content">{children}</span>
        </button>
    );
};

// Enhanced Card Component with Animations
interface AnimatedCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
    tilt?: boolean;
    onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    className = '',
    hover = true,
    glow = false,
    tilt = false,
    onClick
}) => {
    const { playAnimation } = useAnimation();
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hover) return;
        
        setIsHovered(true);
        const card = e.currentTarget;
        await playAnimation(card, 'cardHover', 200);
    };

    const handleMouseLeave = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hover) return;
        
        setIsHovered(false);
        const card = e.currentTarget;
        await playAnimation(card, 'cardLeave', 200);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!tilt) return;
        
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeaveCard = (e: React.MouseEvent<HTMLDivElement>) => {
        if (tilt) {
            const card = e.currentTarget;
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        }
        handleMouseLeave(e);
    };

    return (
        <div
            className={`animated-card ${className} ${isHovered ? 'hovered' : ''} ${glow ? 'glow' : ''} ${tilt ? 'tilt' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeaveCard}
            onMouseMove={handleMouseMove}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

// Loading Animations Component
export const LoadingAnimations: React.FC = () => {
    return (
        <div className="loading-animations">
            {/* Pulse Loader */}
            <div className="pulse-loader">
                <div className="pulse-dot"></div>
                <div className="pulse-dot"></div>
                <div className="pulse-dot"></div>
            </div>
            
            {/* Spinner Loader */}
            <div className="spinner-loader">
                <div className="spinner-ring"></div>
            </div>
            
            {/* Wave Loader */}
            <div className="wave-loader">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
            </div>
        </div>
    );
};

// Progress Bar with Animation
interface AnimatedProgressProps {
    progress: number;
    color?: string;
    height?: number;
    animated?: boolean;
    showPercentage?: boolean;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
    progress,
    color = 'var(--accent-color)',
    height = 8,
    animated = true,
    showPercentage = false
}) => {
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        if (animated) {
            const timer = setTimeout(() => {
                setDisplayProgress(progress);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setDisplayProgress(progress);
        }
    }, [progress, animated]);

    return (
        <div className="animated-progress-container">
            <div 
                className="animated-progress-bar"
                style={{ height: `${height}px` }}
            >
                <div 
                    className={`animated-progress-fill ${animated ? 'animated' : ''}`}
                    style={{ 
                        width: `${displayProgress}%`,
                        backgroundColor: color
                    }}
                />
            </div>
            {showPercentage && (
                <span className="progress-percentage">{Math.round(displayProgress)}%</span>
            )}
        </div>
    );
};

// Notification Toast with Animations
interface ToastNotificationProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
    message,
    type,
    duration = 3000,
    onClose
}) => {
    const { playAnimation } = useAnimation();

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    };

    return (
        <div className={`toast-notification toast-${type}`}>
            <span className="toast-icon">{getIcon()}</span>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={onClose}>✕</button>
        </div>
    );
};
