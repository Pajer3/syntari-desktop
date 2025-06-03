// Syntari AI IDE - Keyboard Shortcuts Management Hook
// Centralized keyboard shortcuts loaded from configuration

import { useState, useEffect, useCallback } from 'react';
import keyboardConfig from '../config/keyboardShortcuts.json';

// ================================
// TYPES
// ================================

export interface KeyboardShortcut {
  key: string;
  description: string;
  implemented: boolean;
  component?: string;
  planned?: boolean;
  priority?: string;
}

export interface ShortcutCategory {
  name: string;
  description: string;
  shortcuts: Record<string, KeyboardShortcut>;
}

export interface KeyboardEvent {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string;
  code: string;
  preventDefault?: () => void;
  stopPropagation?: () => void;
  stopImmediatePropagation?: () => void;
}

export interface ShortcutHandler {
  (event: KeyboardEvent): void | boolean; // Return false to prevent default
}

// ================================
// KEYBOARD SHORTCUTS HOOK
// ================================

export const useKeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Record<string, Record<string, KeyboardShortcut>>>({});
  const [handlers, setHandlers] = useState<Record<string, ShortcutHandler>>({});

  // Load shortcuts from config on mount
  useEffect(() => {
    const loadedShortcuts: Record<string, Record<string, KeyboardShortcut>> = {};
    
    Object.entries(keyboardConfig.categories).forEach(([categoryId, category]) => {
      if (category.shortcuts) {
        loadedShortcuts[categoryId] = category.shortcuts as Record<string, KeyboardShortcut>;
      }
    });
    
    setShortcuts(loadedShortcuts);
    console.log('🎮 Loaded keyboard shortcuts from config:', loadedShortcuts);
  }, []);

  // Register a handler for a specific shortcut
  const registerHandler = useCallback((shortcutId: string, handler: ShortcutHandler) => {
    setHandlers(prev => ({
      ...prev,
      [shortcutId]: handler,
    }));
  }, []);

  // Unregister a handler
  const unregisterHandler = useCallback((shortcutId: string) => {
    setHandlers(prev => {
      const newHandlers = { ...prev };
      delete newHandlers[shortcutId];
      return newHandlers;
    });
  }, []);

  // Check if a keyboard event matches a shortcut
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcutKey: string): boolean => {
    const parts = shortcutKey.toLowerCase().split('+');
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];

    // Check modifiers
    const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('cmd');
    const hasShift = modifiers.includes('shift');
    const hasAlt = modifiers.includes('alt');

    const eventCtrl = event.ctrlKey || event.metaKey;
    const eventShift = event.shiftKey;
    const eventAlt = event.altKey;

    // Check if modifiers match
    if (hasCtrl !== eventCtrl || hasShift !== eventShift || hasAlt !== eventAlt) {
      return false;
    }

    // Check key (normalize case and special keys)
    const normalizedEventKey = event.key.toLowerCase();
    const normalizedShortcutKey = key.toLowerCase();

    return normalizedEventKey === normalizedShortcutKey;
  }, []);

  // Handle keyboard events
  const handleKeyboard = useCallback((event: KeyboardEvent): boolean => {
    // Find matching shortcuts
    const matches: string[] = [];
    
    Object.entries(shortcuts).forEach(([categoryId, categoryShortcuts]) => {
      Object.entries(categoryShortcuts).forEach(([shortcutId, shortcut]) => {
        if (shortcut.implemented && matchesShortcut(event, shortcut.key)) {
          const fullId = `${categoryId}.${shortcutId}`;
          matches.push(fullId);
        }
      });
    });

    // Execute handlers for matches
    let handled = false;
    matches.forEach(shortcutId => {
      const handler = handlers[shortcutId];
      if (handler) {
        const result = handler(event);
        if (result !== false) {
          handled = true;
        }
      }
    });

    return handled;
  }, [shortcuts, handlers, matchesShortcut]);

  // Get shortcut by category and id
  const getShortcut = useCallback((category: string, shortcutId: string): KeyboardShortcut | null => {
    return shortcuts[category]?.[shortcutId] || null;
  }, [shortcuts]);

  // Get all shortcuts for a category
  const getCategoryShortcuts = useCallback((category: string): Record<string, KeyboardShortcut> => {
    return shortcuts[category] || {};
  }, [shortcuts]);

  // Get human-readable shortcut description
  const getShortcutDisplay = useCallback((shortcutKey: string): string => {
    return shortcutKey
      .replace(/ctrl/gi, '⌘')
      .replace(/shift/gi, '⇧')
      .replace(/alt/gi, '⌥')
      .replace(/\+/g, ' + ')
      .replace(/tab/gi, 'Tab')
      .replace(/pageup/gi, 'Page Up')
      .replace(/pagedown/gi, 'Page Down');
  }, []);

  // Check if shortcut is implemented
  const isImplemented = useCallback((category: string, shortcutId: string): boolean => {
    return shortcuts[category]?.[shortcutId]?.implemented || false;
  }, [shortcuts]);

  // Get all implemented shortcuts
  const getImplementedShortcuts = useCallback(() => {
    const implemented: Record<string, KeyboardShortcut> = {};
    
    Object.entries(shortcuts).forEach(([categoryId, categoryShortcuts]) => {
      Object.entries(categoryShortcuts).forEach(([shortcutId, shortcut]) => {
        if (shortcut.implemented) {
          implemented[`${categoryId}.${shortcutId}`] = shortcut;
        }
      });
    });

    return implemented;
  }, [shortcuts]);

  return {
    shortcuts,
    registerHandler,
    unregisterHandler,
    handleKeyboard,
    getShortcut,
    getCategoryShortcuts,
    getShortcutDisplay,
    isImplemented,
    getImplementedShortcuts,
    matchesShortcut,
  };
};

// ================================
// SHORTCUT REGISTRATION HOOK
// ================================

export const useShortcut = (
  category: string,
  shortcutId: string,
  handler: ShortcutHandler,
  dependencies: any[] = []
) => {
  const { registerHandler, unregisterHandler, getShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const fullId = `${category}.${shortcutId}`;
    registerHandler(fullId, handler);

    return () => {
      unregisterHandler(fullId);
    };
  }, [category, shortcutId, registerHandler, unregisterHandler, ...dependencies]);

  return getShortcut(category, shortcutId);
};

// ================================
// GLOBAL KEYBOARD LISTENER HOOK
// ================================

export const useGlobalKeyboardShortcuts = () => {
  const { handleKeyboard } = useKeyboardShortcuts();

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const keyboardEvent: KeyboardEvent = {
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        key: e.key,
        code: e.code,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        stopImmediatePropagation: () => e.stopImmediatePropagation(),
      };

      const handled = handleKeyboard(keyboardEvent);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Use capture phase to handle before components
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyboard]);
}; 