import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeSettings {
    mode: 'dark' | 'darker' | 'midnight';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    animations: boolean;
    compactMode: boolean;
    highContrast: boolean;
    customBackground: string;
}

interface ThemeContextType {
    theme: ThemeSettings;
    updateTheme: (updates: Partial<ThemeSettings>) => void;
    resetTheme: () => void;
    presets: { [key: string]: ThemeSettings };
    applyPreset: (presetName: string) => void;
}

const defaultTheme: ThemeSettings = {
    mode: 'dark',
    accentColor: '#00ff88',
    fontSize: 'medium',
    animations: true,
    compactMode: false,
    highContrast: false,
    customBackground: ''
};

const themePresets = {
    default: defaultTheme,
    neon: {
        ...defaultTheme,
        mode: 'darker' as const,
        accentColor: '#00ffff',
        animations: true,
        customBackground: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
    },
    minimal: {
        ...defaultTheme,
        mode: 'dark' as const,
        accentColor: '#ffffff',
        animations: false,
        compactMode: true,
        customBackground: ''
    },
    gaming: {
        ...defaultTheme,
        mode: 'midnight' as const,
        accentColor: '#ff0080',
        animations: true,
        customBackground: 'radial-gradient(circle at 20% 80%, #120458 0%, #000000 50%)'
    },
    professional: {
        ...defaultTheme,
        mode: 'dark' as const,
        accentColor: '#4a90e2',
        animations: false,
        compactMode: false,
        highContrast: true,
        customBackground: ''
    }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const EnhancedThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeSettings>(() => {
        const saved = localStorage.getItem('ai-content-generator-theme');
        return saved ? JSON.parse(saved) : defaultTheme;
    });

    useEffect(() => {
        localStorage.setItem('ai-content-generator-theme', JSON.stringify(theme));
        applyThemeToDOM(theme);
    }, [theme]);

    const applyThemeToDOM = (themeSettings: ThemeSettings) => {
        const root = document.documentElement;
        
        // Apply CSS custom properties
        root.style.setProperty('--accent-color', themeSettings.accentColor);
        root.style.setProperty('--accent-color-hover', adjustColor(themeSettings.accentColor, -20));
        root.style.setProperty('--accent-color-light', adjustColor(themeSettings.accentColor, 20));
        
        // Apply mode-specific colors
        switch (themeSettings.mode) {
            case 'dark':
                root.style.setProperty('--bg-primary', '#1a1a1a');
                root.style.setProperty('--bg-secondary', '#2a2a2a');
                root.style.setProperty('--bg-tertiary', '#333333');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#cccccc');
                root.style.setProperty('--border-color', '#333333');
                break;
            case 'darker':
                root.style.setProperty('--bg-primary', '#0a0a0a');
                root.style.setProperty('--bg-secondary', '#1a1a1a');
                root.style.setProperty('--bg-tertiary', '#2a2a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#cccccc');
                root.style.setProperty('--border-color', '#2a2a2a');
                break;
            case 'midnight':
                root.style.setProperty('--bg-primary', '#000000');
                root.style.setProperty('--bg-secondary', '#111111');
                root.style.setProperty('--bg-tertiary', '#222222');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#cccccc');
                root.style.setProperty('--border-color', '#222222');
                break;
        }
        
        // Apply font size
        const fontSizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        root.style.setProperty('--base-font-size', fontSizes[themeSettings.fontSize]);
        
        // Apply custom background
        if (themeSettings.customBackground) {
            root.style.setProperty('--custom-background', themeSettings.customBackground);
        } else {
            root.style.removeProperty('--custom-background');
        }
        
        // Apply body classes
        document.body.className = '';
        document.body.classList.add(`theme-${themeSettings.mode}`);
        if (!themeSettings.animations) document.body.classList.add('no-animations');
        if (themeSettings.compactMode) document.body.classList.add('compact-mode');
        if (themeSettings.highContrast) document.body.classList.add('high-contrast');
        if (themeSettings.customBackground) document.body.classList.add('custom-background');
    };

    const adjustColor = (color: string, amount: number): string => {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    };

    const updateTheme = (updates: Partial<ThemeSettings>) => {
        setTheme(prev => ({ ...prev, ...updates }));
    };

    const resetTheme = () => {
        setTheme(defaultTheme);
    };

    const applyPreset = (presetName: string) => {
        if (themePresets[presetName]) {
            setTheme(themePresets[presetName]);
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            updateTheme,
            resetTheme,
            presets: themePresets,
            applyPreset
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Enhanced Theme Customizer Component
export const ThemeCustomizer: React.FC = () => {
    const { theme, updateTheme, resetTheme, presets, applyPreset } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const accentColors = [
        '#00ff88', '#00ffff', '#ff0080', '#4a90e2', '#ff6b6b',
        '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'
    ];

    return (
        <>
            <button 
                className="theme-customizer-trigger"
                onClick={() => setIsOpen(true)}
                title="Customize Theme"
            >
                🎨
            </button>

            {isOpen && (
                <div className="theme-customizer-overlay">
                    <div className="theme-customizer">
                        <div className="customizer-header">
                            <h3>🎨 Theme Customizer</h3>
                            <button 
                                className="close-customizer"
                                onClick={() => setIsOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="customizer-content">
                            {/* Theme Presets */}
                            <div className="customizer-section">
                                <h4>🎭 Presets</h4>
                                <div className="preset-grid">
                                    {Object.entries(presets).map(([name, preset]) => (
                                        <button
                                            key={name}
                                            className={`preset-btn ${JSON.stringify(theme) === JSON.stringify(preset) ? 'active' : ''}`}
                                            onClick={() => applyPreset(name)}
                                            style={{ borderColor: preset.accentColor }}
                                        >
                                            <div 
                                                className="preset-preview"
                                                style={{ 
                                                    background: preset.customBackground || preset.mode === 'dark' ? '#1a1a1a' : preset.mode === 'darker' ? '#0a0a0a' : '#000000',
                                                    borderColor: preset.accentColor
                                                }}
                                            >
                                                <div style={{ color: preset.accentColor }}>●</div>
                                            </div>
                                            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mode Selection */}
                            <div className="customizer-section">
                                <h4>🌙 Mode</h4>
                                <div className="mode-selector">
                                    {(['dark', 'darker', 'midnight'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            className={`mode-btn ${theme.mode === mode ? 'active' : ''}`}
                                            onClick={() => updateTheme({ mode })}
                                        >
                                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Accent Color */}
                            <div className="customizer-section">
                                <h4>🎨 Accent Color</h4>
                                <div className="color-grid">
                                    {accentColors.map(color => (
                                        <button
                                            key={color}
                                            className={`color-btn ${theme.accentColor === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => updateTheme({ accentColor: color })}
                                        />
                                    ))}
                                </div>
                                <input
                                    type="color"
                                    value={theme.accentColor}
                                    onChange={(e) => updateTheme({ accentColor: e.target.value })}
                                    className="custom-color-picker"
                                />
                            </div>

                            {/* Font Size */}
                            <div className="customizer-section">
                                <h4>📝 Font Size</h4>
                                <div className="font-size-selector">
                                    {(['small', 'medium', 'large'] as const).map(size => (
                                        <button
                                            key={size}
                                            className={`size-btn ${theme.fontSize === size ? 'active' : ''}`}
                                            onClick={() => updateTheme({ fontSize: size })}
                                        >
                                            {size.charAt(0).toUpperCase() + size.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="customizer-section">
                                <h4>⚙️ Options</h4>
                                <div className="options-list">
                                    <label className="option-item">
                                        <input
                                            type="checkbox"
                                            checked={theme.animations}
                                            onChange={(e) => updateTheme({ animations: e.target.checked })}
                                        />
                                        <span>Enable Animations</span>
                                    </label>
                                    <label className="option-item">
                                        <input
                                            type="checkbox"
                                            checked={theme.compactMode}
                                            onChange={(e) => updateTheme({ compactMode: e.target.checked })}
                                        />
                                        <span>Compact Mode</span>
                                    </label>
                                    <label className="option-item">
                                        <input
                                            type="checkbox"
                                            checked={theme.highContrast}
                                            onChange={(e) => updateTheme({ highContrast: e.target.checked })}
                                        />
                                        <span>High Contrast</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="customizer-actions">
                                <button 
                                    className="reset-btn"
                                    onClick={resetTheme}
                                >
                                    🔄 Reset to Default
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
