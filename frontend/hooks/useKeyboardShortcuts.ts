import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatch = !!shortcut.altKey === event.altKey;
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;

      return keyMatch && ctrlMatch && altMatch && shiftMatch;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

// Predefined shortcut configurations
export const createContentGeneratorShortcuts = (actions: {
  generateContent: () => void;
  copyLastContent: () => void;
  openSettings: () => void;
  toggleTheme: () => void;
  focusNicheSelect: () => void;
  showHelp: () => void;
  closeModal: () => void;
}) => [
  {
    key: 'g',
    ctrlKey: true,
    action: actions.generateContent,
    description: 'Generate new content'
  },
  {
    key: 'c',
    ctrlKey: true,
    shiftKey: true,
    action: actions.copyLastContent,
    description: 'Copy last generated content'
  },
  {
    key: ',',
    ctrlKey: true,
    action: actions.openSettings,
    description: 'Open settings'
  },
  {
    key: 'd',
    ctrlKey: true,
    action: actions.toggleTheme,
    description: 'Toggle dark/light theme'
  },
  {
    key: 'n',
    ctrlKey: true,
    action: actions.focusNicheSelect,
    description: 'Focus niche selector'
  },
  {
    key: '?',
    action: actions.showHelp,
    description: 'Show keyboard shortcuts help'
  },
  {
    key: 'Escape',
    action: actions.closeModal,
    description: 'Close modal/dialog'
  }
];

export const createGlobalShortcuts = (actions: {
  goToDashboard: () => void;
  goToGenerator: () => void;
  goToSettings: () => void;
  goToAnalytics: () => void;
}) => [
  {
    key: '1',
    ctrlKey: true,
    action: actions.goToDashboard,
    description: 'Go to Dashboard'
  },
  {
    key: '2',
    ctrlKey: true,
    action: actions.goToGenerator,
    description: 'Go to Content Generator'
  },
  {
    key: '3',
    ctrlKey: true,
    action: actions.goToSettings,
    description: 'Go to Settings'
  },
  {
    key: '4',
    ctrlKey: true,
    action: actions.goToAnalytics,
    description: 'Go to Analytics'
  }
];

// Hook for managing modal shortcuts
export const useModalShortcuts = (isOpen: boolean, onClose: () => void) => {
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: onClose,
        description: 'Close modal'
      }
    ],
    enabled: isOpen
  });
};

// Hook for managing form shortcuts
export const useFormShortcuts = (actions: {
  save: () => void;
  cancel: () => void;
  reset?: () => void;
}) => {
  const shortcuts = [
    {
      key: 's',
      ctrlKey: true,
      action: actions.save,
      description: 'Save form'
    },
    {
      key: 'Escape',
      action: actions.cancel,
      description: 'Cancel form'
    }
  ];

  if (actions.reset) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      action: actions.reset,
      description: 'Reset form'
    });
  }

  return useKeyboardShortcuts({ shortcuts });
};

export default useKeyboardShortcuts;
