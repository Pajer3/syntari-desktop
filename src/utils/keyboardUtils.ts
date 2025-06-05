// Syntari AI IDE - Keyboard Utilities Library
// Enterprise-grade keyboard shortcut utilities with cross-platform support

// ================================
// PLATFORM DETECTION
// ================================

export enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac', 
  LINUX = 'linux',
  UNKNOWN = 'unknown'
}

export const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') {
    return Platform.UNKNOWN;
  }

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return Platform.MAC;
  }
  
  if (platform.includes('win') || userAgent.includes('win')) {
    return Platform.WINDOWS;
  }
  
  if (platform.includes('linux') || userAgent.includes('linux')) {
    return Platform.LINUX;
  }

  return Platform.UNKNOWN;
};

// ================================
// KEY NORMALIZATION
// ================================

export interface NormalizedKey {
  key: string;
  modifiers: {
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    alt: boolean;
  };
  isSpecialKey: boolean;
  platform: Platform;
}

export const KEY_MAPPINGS: Record<string, string> = {
  // Special keys
  ' ': 'space',
  'spacebar': 'space',
  'enter': 'enter',
  'return': 'enter',
  'esc': 'escape',
  'escape': 'escape',
  'tab': 'tab',
  'backspace': 'backspace',
  'delete': 'delete',
  'del': 'delete',
  
  // Arrow keys
  'arrowup': 'up',
  'arrowdown': 'down',
  'arrowleft': 'left',
  'arrowright': 'right',
  'up': 'up',
  'down': 'down',
  'left': 'left',
  'right': 'right',
  
  // Page navigation
  'pageup': 'pageup',
  'pagedown': 'pagedown',
  'page up': 'pageup',
  'page down': 'pagedown',
  'home': 'home',
  'end': 'end',
  
  // Function keys
  'f1': 'f1', 'f2': 'f2', 'f3': 'f3', 'f4': 'f4',
  'f5': 'f5', 'f6': 'f6', 'f7': 'f7', 'f8': 'f8',
  'f9': 'f9', 'f10': 'f10', 'f11': 'f11', 'f12': 'f12',
  
  // Modifier aliases
  'command': 'meta',
  'cmd': 'meta',
  'option': 'alt',
  'control': 'ctrl',
  'shift': 'shift',
  'alt': 'alt',
  'meta': 'meta'
};

export const SPECIAL_KEYS = new Set([
  'space', 'enter', 'escape', 'tab', 'backspace', 'delete',
  'up', 'down', 'left', 'right', 'pageup', 'pagedown', 'home', 'end',
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'
]);

export const normalizeKey = (key: string): string => {
  const normalizedKey = key.toLowerCase().trim();
  return KEY_MAPPINGS[normalizedKey] || normalizedKey;
};

export const isSpecialKey = (key: string): boolean => {
  return SPECIAL_KEYS.has(normalizeKey(key));
};

// ================================
// SHORTCUT PARSING
// ================================

export interface ParsedShortcut {
  modifiers: string[];
  key: string;
  isValid: boolean;
  platform: Platform;
  displayString: string;
  errorMessage?: string;
}

export const parseShortcut = (shortcutString: string, platform?: Platform): ParsedShortcut => {
  const currentPlatform = platform || detectPlatform();
  
  try {
    if (!shortcutString || typeof shortcutString !== 'string') {
      return {
        modifiers: [],
        key: '',
        isValid: false,
        platform: currentPlatform,
        displayString: '',
        errorMessage: 'Invalid shortcut string'
      };
    }

    const parts = shortcutString.toLowerCase().split('+').map(p => p.trim());
    
    if (parts.length === 0) {
      return {
        modifiers: [],
        key: '',
        isValid: false,
        platform: currentPlatform,
        displayString: '',
        errorMessage: 'Empty shortcut'
      };
    }

    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);
    
    // Validate modifiers
    const validModifiers = ['ctrl', 'meta', 'cmd', 'shift', 'alt', 'option', 'control', 'command'];
    const invalidModifiers = modifiers.filter(mod => !validModifiers.includes(mod));
    
    if (invalidModifiers.length > 0) {
      return {
        modifiers,
        key,
        isValid: false,
        platform: currentPlatform,
        displayString: shortcutString,
        errorMessage: `Invalid modifiers: ${invalidModifiers.join(', ')}`
      };
    }

    // Normalize modifiers
    const normalizedModifiers = modifiers.map(mod => {
      switch (mod) {
        case 'cmd':
        case 'command':
          return 'meta';
        case 'option':
          return 'alt';
        case 'control':
          return 'ctrl';
        default:
          return mod;
      }
    });

    const normalizedKey = normalizeKey(key);
    const displayString = formatShortcutForDisplay(normalizedModifiers, normalizedKey, currentPlatform);

    return {
      modifiers: normalizedModifiers,
      key: normalizedKey,
      isValid: true,
      platform: currentPlatform,
      displayString,
    };
  } catch (error) {
    return {
      modifiers: [],
      key: '',
      isValid: false,
      platform: currentPlatform,
      displayString: shortcutString,
      errorMessage: `Parsing error: ${error}`
    };
  }
};

// ================================
// DISPLAY FORMATTING
// ================================

export const PLATFORM_DISPLAY_MAPPINGS: Record<Platform, Record<string, string>> = {
  [Platform.MAC]: {
    'ctrl': '⌃',
    'meta': '⌘',
    'shift': '⇧',
    'alt': '⌥',
    'space': 'Space',
    'enter': 'Return',
    'escape': 'Esc',
    'tab': 'Tab',
    'backspace': '⌫',
    'delete': '⌦',
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→',
    'pageup': 'Page Up',
    'pagedown': 'Page Down'
  },
  [Platform.WINDOWS]: {
    'ctrl': 'Ctrl',
    'meta': 'Win',
    'shift': 'Shift',
    'alt': 'Alt',
    'space': 'Space',
    'enter': 'Enter',
    'escape': 'Esc',
    'tab': 'Tab',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→',
    'pageup': 'Page Up',
    'pagedown': 'Page Down'
  },
  [Platform.LINUX]: {
    'ctrl': 'Ctrl',
    'meta': 'Super',
    'shift': 'Shift',
    'alt': 'Alt',
    'space': 'Space',
    'enter': 'Enter',
    'escape': 'Esc',
    'tab': 'Tab',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→',
    'pageup': 'Page Up',
    'pagedown': 'Page Down'
  },
  [Platform.UNKNOWN]: {
    'ctrl': 'Ctrl',
    'meta': 'Meta',
    'shift': 'Shift',
    'alt': 'Alt',
    'space': 'Space',
    'enter': 'Enter',
    'escape': 'Esc',
    'tab': 'Tab',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→',
    'pageup': 'Page Up',
    'pagedown': 'Page Down'
  }
};

export const formatShortcutForDisplay = (
  modifiers: string[], 
  key: string, 
  platform?: Platform
): string => {
  const currentPlatform = platform || detectPlatform();
  const displayMappings = PLATFORM_DISPLAY_MAPPINGS[currentPlatform];
  
  const formattedModifiers = modifiers.map(mod => displayMappings[mod] || mod);
  const formattedKey = displayMappings[key] || key.toUpperCase();
  
  // Different join patterns for different platforms
  if (currentPlatform === Platform.MAC) {
    return [...formattedModifiers, formattedKey].join('');
  } else {
    return [...formattedModifiers, formattedKey].join(' + ');
  }
};

// ================================
// EVENT MATCHING
// ================================

export interface KeyboardEventData {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export const matchesShortcut = (
  event: KeyboardEventData,
  shortcutString: string,
  platform?: Platform
): boolean => {
  const parsed = parseShortcut(shortcutString, platform);
  
  if (!parsed.isValid) {
    return false;
  }

  const eventKey = normalizeKey(event.key);
  if (eventKey !== parsed.key) {
    return false;
  }

  // Check modifiers
  const hasCtrl = parsed.modifiers.includes('ctrl');
  const hasMeta = parsed.modifiers.includes('meta');
  const hasShift = parsed.modifiers.includes('shift');
  const hasAlt = parsed.modifiers.includes('alt');

  return (
    hasCtrl === event.ctrlKey &&
    hasMeta === event.metaKey &&
    hasShift === event.shiftKey &&
    hasAlt === event.altKey
  );
};

// ================================
// SHORTCUT VALIDATION
// ================================

export interface ShortcutValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

export const validateShortcut = (
  shortcutString: string,
  platform?: Platform
): ShortcutValidationResult => {
  const result: ShortcutValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    suggestions: []
  };

  const parsed = parseShortcut(shortcutString, platform);
  
  if (!parsed.isValid) {
    result.isValid = false;
    result.errors.push(parsed.errorMessage || 'Invalid shortcut format');
    return result;
  }

  // Check for common issues
  if (parsed.modifiers.length === 0) {
    result.warnings.push('Shortcut without modifiers may conflict with typing');
    result.suggestions.push('Consider adding Ctrl, Alt, or Meta modifier');
  }

  // Check for platform-specific issues
  const currentPlatform = platform || detectPlatform();
  
  if (currentPlatform === Platform.MAC && parsed.modifiers.includes('ctrl') && !parsed.modifiers.includes('meta')) {
    result.warnings.push('On Mac, Cmd is typically preferred over Ctrl');
    result.suggestions.push(`Consider using "Meta+${parsed.key}" instead`);
  }

  // Check for accessibility concerns
  if (parsed.modifiers.length > 2) {
    result.warnings.push('Complex shortcuts may be difficult for some users');
    result.suggestions.push('Consider simpler modifier combinations');
  }

  // Check for reserved system shortcuts
  const reservedShortcuts = [
    'alt+f4', 'ctrl+alt+delete', 'cmd+q', 'cmd+w', 'cmd+tab'
  ];
  
  const shortcutLower = shortcutString.toLowerCase().replace(/\s+/g, '');
  if (reservedShortcuts.some(reserved => shortcutLower.includes(reserved.replace(/\s+/g, '')))) {
    result.warnings.push('This shortcut may conflict with system shortcuts');
  }

  return result;
};

// ================================
// SHORTCUT CONFLICT DETECTION
// ================================

export interface ShortcutConflict {
  shortcut1: string;
  shortcut2: string;
  conflictType: 'exact' | 'partial' | 'system';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export const detectShortcutConflicts = (
  shortcuts: Record<string, string>,
  _platform?: Platform
): ShortcutConflict[] => {
  const conflicts: ShortcutConflict[] = [];
  const entries = Object.entries(shortcuts);

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [id1, shortcut1] = entries[i];
      const [id2, shortcut2] = entries[j];

      if (shortcut1.toLowerCase() === shortcut2.toLowerCase()) {
        conflicts.push({
          shortcut1: `${id1}: ${shortcut1}`,
          shortcut2: `${id2}: ${shortcut2}`,
          conflictType: 'exact',
          severity: 'high',
          recommendation: 'Change one of these shortcuts to avoid conflicts'
        });
      }
    }
  }

  return conflicts;
};

// ================================
// PERFORMANCE UTILITIES
// ================================

export class ShortcutMatcher {
  private shortcutCache = new Map<string, ParsedShortcut>();
  private matchCache = new Map<string, boolean>();
  private cacheSize = 1000;

  parseShortcutCached(shortcutString: string, platform?: Platform): ParsedShortcut {
    const cacheKey = `${shortcutString}:${platform || 'default'}`;
    
    if (this.shortcutCache.has(cacheKey)) {
      return this.shortcutCache.get(cacheKey)!;
    }

    const parsed = parseShortcut(shortcutString, platform);
    
    // Maintain cache size
    if (this.shortcutCache.size >= this.cacheSize) {
      const firstKey = this.shortcutCache.keys().next().value;
      if (firstKey !== undefined) {
        this.shortcutCache.delete(firstKey);
      }
    }

    this.shortcutCache.set(cacheKey, parsed);
    return parsed;
  }

  matchesShortcutCached(
    event: KeyboardEventData,
    shortcutString: string,
    platform?: Platform
  ): boolean {
    const eventKey = `${event.key}:${event.ctrlKey}:${event.metaKey}:${event.shiftKey}:${event.altKey}`;
    const cacheKey = `${eventKey}:${shortcutString}:${platform || 'default'}`;

    if (this.matchCache.has(cacheKey)) {
      return this.matchCache.get(cacheKey)!;
    }

    const result = matchesShortcut(event, shortcutString, platform);

    // Maintain cache size
    if (this.matchCache.size >= this.cacheSize) {
      const firstKey = this.matchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.matchCache.delete(firstKey);
      }
    }

    this.matchCache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.shortcutCache.clear();
    this.matchCache.clear();
  }

  getCacheStats(): { shortcutCacheSize: number; matchCacheSize: number } {
    return {
      shortcutCacheSize: this.shortcutCache.size,
      matchCacheSize: this.matchCache.size
    };
  }
}

// ================================
// ACCESSIBILITY UTILITIES
// ================================

export interface AccessibilityOptions {
  showVisualFeedback: boolean;
  enableSoundFeedback: boolean;
  highlightDuration: number;
  respectReducedMotion: boolean;
}

export const getAccessibilityOptions = (): AccessibilityOptions => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return {
    showVisualFeedback: true,
    enableSoundFeedback: false,
    highlightDuration: prefersReducedMotion ? 0 : 300,
    respectReducedMotion: prefersReducedMotion
  };
};

export const announceShortcut = (shortcutName: string, action: string): void => {
  // Create accessibility announcement for screen readers
  const announcement = `${shortcutName} shortcut activated: ${action}`;
  
  const ariaLiveElement = document.createElement('div');
  ariaLiveElement.setAttribute('aria-live', 'polite');
  ariaLiveElement.setAttribute('aria-atomic', 'true');
  ariaLiveElement.style.position = 'absolute';
  ariaLiveElement.style.left = '-10000px';
  ariaLiveElement.style.width = '1px';
  ariaLiveElement.style.height = '1px';
  ariaLiveElement.style.overflow = 'hidden';
  
  document.body.appendChild(ariaLiveElement);
  ariaLiveElement.textContent = announcement;
  
  setTimeout(() => {
    document.body.removeChild(ariaLiveElement);
  }, 1000);
};

// ================================
// EXPORTS
// ================================

export default {
  Platform,
  detectPlatform,
  normalizeKey,
  isSpecialKey,
  parseShortcut,
  formatShortcutForDisplay,
  matchesShortcut,
  validateShortcut,
  detectShortcutConflicts,
  ShortcutMatcher,
  getAccessibilityOptions,
  announceShortcut
}; 