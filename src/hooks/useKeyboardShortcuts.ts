// Syntari AI IDE - Advanced Keyboard Shortcuts Management System
// Enterprise-grade keyboard shortcuts with performance monitoring and error handling

import { useState, useEffect, useCallback, useRef } from 'react';
import keyboardConfig from '../config/keyboardShortcuts.json';

// ================================
// ENHANCED TYPES
// ================================

export interface KeyboardShortcut {
  key: string;
  description: string;
  implemented: boolean;
  component?: string;
  planned?: boolean;
  priority?: string;
  features?: string[];
}

export interface ShortcutCategory {
  name: string;
  description: string;
  shortcuts: Record<string, KeyboardShortcut>;
  contextMenu?: {
    trigger: string;
    actions: Record<string, string>;
  };
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

export interface ShortcutExecutionMetrics {
  shortcutId: string;
  executionTime: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

export interface PerformanceMetrics {
  totalExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  recentExecutions: ShortcutExecutionMetrics[];
}

// ================================
// ENTERPRISE KEYBOARD SHORTCUTS MANAGER
// ================================

class EnhancedKeyboardShortcutsManager {
  private shortcuts: Record<string, Record<string, KeyboardShortcut>> = {};
  private handlers: Record<string, ShortcutHandler> = {};
  private executionMetrics: ShortcutExecutionMetrics[] = [];
  private debugMode: boolean = false;
  private isInitialized = false;
  private readonly maxMetricsHistory = 1000;

  constructor() {
    // Enable debug mode in development
    this.debugMode = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }

  initialize(): void {
    if (this.isInitialized) return;
    
    try {
      const loadedShortcuts: Record<string, Record<string, KeyboardShortcut>> = {};
      
      Object.entries(keyboardConfig.categories).forEach(([categoryId, category]) => {
        if (category.shortcuts) {
          loadedShortcuts[categoryId] = category.shortcuts as Record<string, KeyboardShortcut>;
        }
      });
      
      this.shortcuts = loadedShortcuts;
      this.isInitialized = true;
      
      if (this.debugMode) {
        console.log('🎮 Enhanced keyboard shortcuts manager initialized:', {
          categories: Object.keys(loadedShortcuts),
          totalShortcuts: Object.values(loadedShortcuts).reduce((sum, cat) => sum + Object.keys(cat).length, 0),
          implementedShortcuts: this.getImplementedShortcutsCount()
        });
      }
    } catch (error) {
      console.error('🚨 Failed to initialize keyboard shortcuts manager:', error);
      throw new Error(`Keyboard shortcuts initialization failed: ${error}`);
    }
  }

  private getImplementedShortcutsCount(): number {
    return Object.values(this.shortcuts).reduce((sum, categoryShortcuts) => {
      return sum + Object.values(categoryShortcuts).filter(s => s.implemented).length;
    }, 0);
  }

  getShortcuts(): Record<string, Record<string, KeyboardShortcut>> {
    this.initialize();
    return { ...this.shortcuts }; // Return copy to prevent mutation
  }

  registerHandler(shortcutId: string, handler: ShortcutHandler): void {
    if (!shortcutId || typeof handler !== 'function') {
      throw new Error(`Invalid handler registration: shortcutId=${shortcutId}, handler=${typeof handler}`);
    }

    this.handlers[shortcutId] = handler;
    
    if (this.debugMode) {
      console.log(`🎮 Registered handler for: ${shortcutId}`);
    }
  }

  unregisterHandler(shortcutId: string): void {
    if (this.handlers[shortcutId]) {
      delete this.handlers[shortcutId];
      
      if (this.debugMode) {
        console.log(`🎮 Unregistered handler for: ${shortcutId}`);
      }
    }
  }

  handleKeyboard(event: KeyboardEvent): boolean {
    this.initialize();
    
    const startTime = performance.now();
    let handled = false;
    let executedShortcut: string | null = null;
    
    try {
      // Find matching shortcuts
      const matches = this.findMatchingShortcuts(event);
      
      if (this.debugMode && matches.length > 0) {
        console.log(`🎮 Found ${matches.length} matching shortcuts:`, matches);
      }

      // Execute handlers for matches
      for (const shortcutId of matches) {
        const handler = this.handlers[shortcutId];
        
        if (handler) {
          if (this.debugMode) {
            console.log(`🎮 Executing handler for: ${shortcutId}`);
          }
          
          try {
            const result = handler(event);
            if (result !== false) {
              handled = true;
              executedShortcut = shortcutId;
            }
          } catch (handlerError) {
            console.error(`🚨 Error executing handler for ${shortcutId}:`, handlerError);
            this.recordExecution(shortcutId, startTime, false, String(handlerError));
          }
        } else if (this.debugMode) {
          console.warn(`🎮 No handler found for matched shortcut: ${shortcutId}`);
        }
      }

      // Record successful execution
      if (executedShortcut) {
        this.recordExecution(executedShortcut, startTime, true);
      }

    } catch (error) {
      console.error('🚨 Critical error in keyboard handler:', error);
      if (executedShortcut) {
        this.recordExecution(executedShortcut, startTime, false, String(error));
      }
    }

    return handled;
  }

  private findMatchingShortcuts(event: KeyboardEvent): string[] {
    const matches: string[] = [];
    
    Object.entries(this.shortcuts).forEach(([categoryId, categoryShortcuts]) => {
      Object.entries(categoryShortcuts).forEach(([shortcutId, shortcut]) => {
        if (shortcut.implemented && this.matchesShortcut(event, shortcut.key)) {
          const fullId = `${categoryId}.${shortcutId}`;
          matches.push(fullId);
        }
      });
    });

    return matches;
  }

  private recordExecution(shortcutId: string, startTime: number, success: boolean, error?: string): void {
    const executionTime = performance.now() - startTime;
    const metric: ShortcutExecutionMetrics = {
      shortcutId,
      executionTime,
      success,
      timestamp: Date.now(),
      error
    };

    this.executionMetrics.push(metric);

    // Maintain metrics history limit
    if (this.executionMetrics.length > this.maxMetricsHistory) {
      this.executionMetrics = this.executionMetrics.slice(-this.maxMetricsHistory);
    }

    // Log performance warnings
    if (executionTime > 100) { // 100ms threshold
      console.warn(`🐌 Slow keyboard shortcut execution: ${shortcutId} took ${executionTime.toFixed(2)}ms`);
    }
  }

  matchesShortcut(event: KeyboardEvent, shortcutKey: string): boolean {
    try {
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

      // Check if modifiers match exactly
      if (hasCtrl !== eventCtrl || hasShift !== eventShift || hasAlt !== eventAlt) {
        return false;
      }

      // Normalize keys for comparison
      const normalizedEventKey = this.normalizeKey(event.key);
      const normalizedShortcutKey = this.normalizeKey(key);

      return normalizedEventKey === normalizedShortcutKey;
    } catch (error) {
      console.error(`🚨 Error matching shortcut "${shortcutKey}":`, error);
      return false;
    }
  }

  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      'pageup': 'pageup',
      'pagedown': 'pagedown',
      'page up': 'pageup',
      'page down': 'pagedown',
      ' ': 'space',
      'enter': 'enter',
      'return': 'enter',
      'esc': 'escape',
      'escape': 'escape'
    };

    const lowercaseKey = key.toLowerCase();
    return keyMap[lowercaseKey] || lowercaseKey;
  }

  getShortcut(category: string, shortcutId: string): KeyboardShortcut | null {
    this.initialize();
    return this.shortcuts[category]?.[shortcutId] || null;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const recentMetrics = this.executionMetrics.slice(-100); // Last 100 executions
    const successfulExecutions = recentMetrics.filter(m => m.success);
    
    return {
      totalExecutions: this.executionMetrics.length,
      averageExecutionTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length 
        : 0,
      successRate: recentMetrics.length > 0 
        ? (successfulExecutions.length / recentMetrics.length) * 100 
        : 100,
      recentExecutions: recentMetrics
    };
  }

  getDebugInfo(): Record<string, any> {
    return {
      isInitialized: this.isInitialized,
      shortcutsCount: Object.keys(this.shortcuts).length,
      handlersCount: Object.keys(this.handlers).length,
      metricsCount: this.executionMetrics.length,
      debugMode: this.debugMode,
      performanceMetrics: this.getPerformanceMetrics()
    };
  }

  enableDebugMode(enabled: boolean = true): void {
    this.debugMode = enabled;
    console.log(`🎮 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance with enhanced error handling
const keyboardManager = new EnhancedKeyboardShortcutsManager();

// ================================
// ENHANCED KEYBOARD SHORTCUTS HOOKS
// ================================

export const useKeyboardShortcuts = () => {
  const [, forceUpdate] = useState({});
  const initRef = useRef(false);
  
  // Initialize only once with error handling
  useEffect(() => {
    if (!initRef.current) {
      try {
        keyboardManager.initialize();
        initRef.current = true;
        forceUpdate({}); // Force re-render after initialization
      } catch (error) {
        console.error('🚨 Failed to initialize keyboard shortcuts:', error);
      }
    }
  }, []);

  const registerHandler = useCallback((shortcutId: string, handler: ShortcutHandler) => {
    try {
      keyboardManager.registerHandler(shortcutId, handler);
    } catch (error) {
      console.error(`🚨 Failed to register handler for ${shortcutId}:`, error);
    }
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
      .replace(/ctrl/gi, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
      .replace(/shift/gi, '⇧')
      .replace(/alt/gi, navigator.platform.includes('Mac') ? '⌥' : 'Alt')
      .replace(/\+/g, ' + ')
      .replace(/tab/gi, 'Tab')
      .replace(/pageup/gi, 'Page Up')
      .replace(/pagedown/gi, 'Page Down')
      .replace(/space/gi, 'Space')
      .replace(/enter/gi, 'Enter')
      .replace(/escape/gi, 'Esc');
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

  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    return keyboardManager.getPerformanceMetrics();
  }, []);

  const getDebugInfo = useCallback(() => {
    return keyboardManager.getDebugInfo();
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
    getPerformanceMetrics,
    getDebugInfo,
  };
};

// ================================
// ENHANCED SHORTCUT REGISTRATION HOOK
// ================================

export const useShortcut = (
  category: string,
  shortcutId: string,
  handler: ShortcutHandler,
  dependencies: any[] = []
) => {
  const { registerHandler, unregisterHandler, getShortcut } = useKeyboardShortcuts();
  const handlerRef = useRef(handler);

  // Update handler reference when dependencies change
  useEffect(() => {
    handlerRef.current = handler;
  }, dependencies);

  useEffect(() => {
    const fullId = `${category}.${shortcutId}`;
    
    // Wrapper to use the latest handler
    const wrappedHandler = (event: KeyboardEvent) => {
      return handlerRef.current(event);
    };

    registerHandler(fullId, wrappedHandler);

    return () => {
      unregisterHandler(fullId);
    };
  }, [category, shortcutId, registerHandler, unregisterHandler]);

  return getShortcut(category, shortcutId);
};

// ================================
// ENHANCED GLOBAL KEYBOARD LISTENER HOOK
// ================================

export const useGlobalKeyboardShortcuts = () => {
  const { handleKeyboard } = useKeyboardShortcuts();
  const handlerRef = useRef(handleKeyboard);

  // Update handler reference
  useEffect(() => {
    handlerRef.current = handleKeyboard;
  }, [handleKeyboard]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Prevent shortcuts when typing in input elements (except specific cases)
      const target = e.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      // Allow certain shortcuts even in input elements
      const allowedInInputs = ['ctrl+s', 'ctrl+z', 'ctrl+y', 'ctrl+a', 'ctrl+p'];
      const currentShortcut = [
        e.ctrlKey && 'ctrl',
        e.shiftKey && 'shift', 
        e.altKey && 'alt',
        e.key.toLowerCase()
      ].filter(Boolean).join('+');

      if (isInputElement && !allowedInInputs.includes(currentShortcut)) {
        return;
      }

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

      const handled = handlerRef.current(keyboardEvent);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Use capture phase to handle before other components
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
};

// ================================
// PERFORMANCE MONITORING HOOK
// ================================

export const useKeyboardPerformanceMonitoring = () => {
  const { getPerformanceMetrics, getDebugInfo } = useKeyboardShortcuts();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getPerformanceMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);

  const logDebugInfo = useCallback(() => {
    console.table(getDebugInfo());
  }, [getDebugInfo]);

  return {
    metrics,
    logDebugInfo
  };
}; 