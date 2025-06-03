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
// SINGLETON KEYBOARD SHORTCUTS MANAGER
// ================================

class KeyboardShortcutsManager {
  private shortcuts: Record<string, Record<string, KeyboardShortcut>> = {};
  private handlers: Record<string, ShortcutHandler> = {};
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;
    
    const loadedShortcuts: Record<string, Record<string, KeyboardShortcut>> = {};
    
    Object.entries(keyboardConfig.categories).forEach(([categoryId, category]) => {
      if (category.shortcuts) {
        loadedShortcuts[categoryId] = category.shortcuts as Record<string, KeyboardShortcut>;
      }
    });
    
    this.shortcuts = loadedShortcuts;
    this.isInitialized = true;
    console.log('🎮 Initialized keyboard shortcuts manager:', loadedShortcuts);
  }

  getShortcuts() {
    this.initialize();
    return this.shortcuts;
  }

  registerHandler(shortcutId: string, handler: ShortcutHandler) {
    this.handlers[shortcutId] = handler;
    console.log(`🎮 Registered handler for: ${shortcutId}`);
  }

  unregisterHandler(shortcutId: string) {
    delete this.handlers[shortcutId];
    console.log(`🎮 Unregistered handler for: ${shortcutId}`);
  }

  handleKeyboard(event: KeyboardEvent): boolean {
    this.initialize();
    
    // Debug logging for Ctrl+P specifically
    if (event.ctrlKey && event.key.toLowerCase() === 'p') {
      console.log('🎮 Ctrl+P detected, checking handlers...');
      console.log('🎮 Available handlers:', Object.keys(this.handlers));
    }
    
    // Find matching shortcuts
    const matches: string[] = [];
    
    Object.entries(this.shortcuts).forEach(([categoryId, categoryShortcuts]) => {
      Object.entries(categoryShortcuts).forEach(([shortcutId, shortcut]) => {
        if (shortcut.implemented && this.matchesShortcut(event, shortcut.key)) {
          const fullId = `${categoryId}.${shortcutId}`;
          matches.push(fullId);
          
          // Debug logging for matches
          if (event.ctrlKey && event.key.toLowerCase() === 'p') {
            console.log(`🎮 Found match: ${fullId} for shortcut ${shortcut.key}`);
          }
        }
      });
    });

    // Execute handlers for matches
    let handled = false;
    matches.forEach(shortcutId => {
      const handler = this.handlers[shortcutId];
      if (handler) {
        console.log(`🎮 Executing handler for: ${shortcutId}`);
        const result = handler(event);
        if (result !== false) {
          handled = true;
        }
      } else {
        console.warn(`🎮 No handler found for matched shortcut: ${shortcutId}`);
      }
    });

    return handled;
  }

  matchesShortcut(event: KeyboardEvent, shortcutKey: string): boolean {
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
  }

  getShortcut(category: string, shortcutId: string): KeyboardShortcut | null {
    this.initialize();
    return this.shortcuts[category]?.[shortcutId] || null;
  }
}

// Singleton instance
const keyboardManager = new KeyboardShortcutsManager();

// ================================
// KEYBOARD SHORTCUTS HOOK
// ================================

export const useKeyboardShortcuts = () => {
  const [, forceUpdate] = useState({});
  
  // Initialize only once
  useEffect(() => {
    keyboardManager.initialize();
    forceUpdate({}); // Force re-render after initialization
  }, []);

  const registerHandler = useCallback((shortcutId: string, handler: ShortcutHandler) => {
    keyboardManager.registerHandler(shortcutId, handler);
  }, []);

  const unregisterHandler = useCallback((shortcutId: string) => {
    keyboardManager.unregisterHandler(shortcutId);
  }, []);

  const handleKeyboard = useCallback((event: KeyboardEvent): boolean => {
    return keyboardManager.handleKeyboard(event);
  }, []);

  const getShortcut = useCallback((category: string, shortcutId: string): KeyboardShortcut | null => {
    return keyboardManager.getShortcut(category, shortcutId);
  }, []);

  const getCategoryShortcuts = useCallback((category: string): Record<string, KeyboardShortcut> => {
    const shortcuts = keyboardManager.getShortcuts();
    return shortcuts[category] || {};
  }, []);

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

  const isImplemented = useCallback((category: string, shortcutId: string): boolean => {
    const shortcut = keyboardManager.getShortcut(category, shortcutId);
    return shortcut?.implemented || false;
  }, []);

  const getImplementedShortcuts = useCallback(() => {
    const shortcuts = keyboardManager.getShortcuts();
    const implemented: Record<string, KeyboardShortcut> = {};
    
    Object.entries(shortcuts).forEach(([categoryId, categoryShortcuts]) => {
      Object.entries(categoryShortcuts).forEach(([shortcutId, shortcut]) => {
        if (shortcut.implemented) {
          implemented[`${categoryId}.${shortcutId}`] = shortcut;
        }
      });
    });

    return implemented;
  }, []);

  const matchesShortcut = useCallback((event: KeyboardEvent, shortcutKey: string): boolean => {
    return keyboardManager.matchesShortcut(event, shortcutKey);
  }, []);

  return {
    shortcuts: keyboardManager.getShortcuts(),
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