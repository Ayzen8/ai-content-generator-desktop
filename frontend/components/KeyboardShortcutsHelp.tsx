import React from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts
}) => {
  if (!isOpen) return null;

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    
    // Format special keys
    let keyDisplay = shortcut.key;
    switch (shortcut.key.toLowerCase()) {
      case 'escape':
        keyDisplay = 'Esc';
        break;
      case ' ':
        keyDisplay = 'Space';
        break;
      case 'arrowup':
        keyDisplay = '↑';
        break;
      case 'arrowdown':
        keyDisplay = '↓';
        break;
      case 'arrowleft':
        keyDisplay = '←';
        break;
      case 'arrowright':
        keyDisplay = '→';
        break;
      case 'enter':
        keyDisplay = 'Enter';
        break;
      case 'tab':
        keyDisplay = 'Tab';
        break;
      default:
        keyDisplay = shortcut.key.toUpperCase();
    }
    
    keys.push(keyDisplay);
    
    return keys.join(' + ');
  };

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    // Group shortcuts by category based on description
    let category = 'General';
    
    if (shortcut.description.toLowerCase().includes('content') || 
        shortcut.description.toLowerCase().includes('generate')) {
      category = 'Content Generation';
    } else if (shortcut.description.toLowerCase().includes('navigation') ||
               shortcut.description.toLowerCase().includes('go to')) {
      category = 'Navigation';
    } else if (shortcut.description.toLowerCase().includes('modal') ||
               shortcut.description.toLowerCase().includes('close') ||
               shortcut.description.toLowerCase().includes('cancel')) {
      category = 'Interface';
    } else if (shortcut.description.toLowerCase().includes('copy') ||
               shortcut.description.toLowerCase().includes('save')) {
      category = 'Actions';
    }
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>×</button>
        </div>
        
        <div className="shortcuts-content">
          <p className="shortcuts-description">
            Use these keyboard shortcuts to navigate and interact with ezBot more efficiently.
          </p>
          
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="shortcuts-category">
              <h3 className="shortcuts-category-title">{category}</h3>
              <div className="shortcuts-list">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <div className="shortcut-keys">
                      {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="shortcut-key">{key}</kbd>
                          {keyIndex < formatShortcut(shortcut).split(' + ').length - 1 && (
                            <span className="shortcut-plus">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="shortcut-description">{shortcut.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="shortcuts-tips">
            <h3>💡 Tips</h3>
            <ul>
              <li>Shortcuts work when you're not typing in input fields</li>
              <li>Press <kbd>?</kbd> anytime to show this help</li>
              <li>Press <kbd>Esc</kbd> to close modals and dialogs</li>
              <li>Use <kbd>Tab</kbd> to navigate between interactive elements</li>
            </ul>
          </div>
        </div>
        
        <div className="shortcuts-footer">
          <button className="shortcuts-btn" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
