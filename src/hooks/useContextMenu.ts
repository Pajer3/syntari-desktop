// Syntari AI IDE - Enterprise Context Menu Hook
// Professional context menu with accessibility, security, and performance optimization

import React, { useState, useCallback, useEffect, useRef } from 'react';

// ================================
// ENTERPRISE CONFIGURATION
// ================================

const CONTEXT_MENU_CONFIG = {
  MENU_WIDTH: 220,
  MENU_HEIGHT: 400,
  MIN_MARGIN: 12,
  ANIMATION_DURATION: 150,
  MAX_MENU_ITEMS: 50,
  ACCESSIBILITY_DELAY: 100,
  KEYBOARD_NAVIGATION_DELAY: 200,
} as const;

const MENU_SECURITY = {
  MAX_INTERACTIONS_PER_MINUTE: 100,
  SUSPICIOUS_BEHAVIOR_THRESHOLD: 20,
  AUDIT_BATCH_SIZE: 10,
} as const;

// ================================
// ENTERPRISE INTERFACES
// ================================

interface ContextMenuState {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly trigger: 'mouse' | 'keyboard' | 'programmatic';
  readonly timestamp: number;
  readonly accessibilityMode: boolean;
}

interface ContextMenuMetrics {
  readonly totalInteractions: number;
  readonly averageDisplayTime: number;
  readonly keyboardUsagePercentage: number;
  readonly securityViolations: number;
  readonly performanceWarnings: number;
}

interface ContextMenuAudit {
  readonly actionId: string;
  readonly action: string;
  readonly trigger: 'mouse' | 'keyboard' | 'programmatic';
  readonly position: { x: number; y: number };
  readonly timestamp: number;
  readonly userAgent: string;
  readonly securityFlags: readonly string[];
}

interface UseContextMenuReturn {
  // Core State
  readonly contextMenu: ContextMenuState;
  readonly metrics: ContextMenuMetrics;
  
  // Primary Actions
  readonly showContextMenu: (x: number, y: number, trigger?: 'mouse' | 'keyboard' | 'programmatic') => void;
  readonly hideContextMenu: (reason?: string) => void;
  readonly handleContextMenu: (event: React.MouseEvent) => void;
  
  // Accessibility Features
  readonly handleKeyboardNavigation: (event: React.KeyboardEvent) => boolean;
  readonly announceToScreenReader: (message: string) => void;
  readonly setAccessibilityMode: (enabled: boolean) => void;
  
  // Enterprise Features
  readonly validateSecurityContext: () => Promise<boolean>;
  readonly exportAuditLog: () => readonly ContextMenuAudit[];
  readonly resetMetrics: () => void;
  
  // Computed Properties
  readonly isSecure: boolean;
  readonly performanceScore: number;
  readonly accessibilityCompliant: boolean;
}

// ================================
// ENTERPRISE CONTEXT MENU HOOK
// ================================

export const useContextMenu = (): UseContextMenuReturn => {
  // ================================
  // STATE MANAGEMENT (IMMUTABLE)
  // ================================
  
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    trigger: 'mouse',
    timestamp: 0,
    accessibilityMode: false,
  });
  
  const [metrics, setMetrics] = useState<ContextMenuMetrics>({
    totalInteractions: 0,
    averageDisplayTime: 0,
    keyboardUsagePercentage: 0,
    securityViolations: 0,
    performanceWarnings: 0,
  });
  
  // Enterprise State Management
  const [auditLog, setAuditLog] = useState<readonly ContextMenuAudit[]>([]);
  const [interactionTimestamps, setInteractionTimestamps] = useState<readonly number[]>([]);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState<boolean>(false);
  
  // Performance and Security References
  const displayStartTimeRef = useRef<number>(0);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  const securityViolationCountRef = useRef<number>(0);
  const keyboardInteractionsRef = useRef<number>(0);
  const totalInteractionsRef = useRef<number>(0);
  const menuElementRef = useRef<HTMLElement | null>(null);
  
  // ================================
  // COMPUTED PROPERTIES
  // ================================
  
  const isSecure = securityViolationCountRef.current === 0 && 
    interactionTimestamps.length < MENU_SECURITY.MAX_INTERACTIONS_PER_MINUTE;
  
  const performanceScore = Math.max(0, 100 - (metrics.performanceWarnings * 10));
  
  const accessibilityCompliant = accessibilityEnabled && 
    metrics.keyboardUsagePercentage > 0 &&
    contextMenu.accessibilityMode;
  
  // ================================
  // SECURITY & VALIDATION
  // ================================
  
  const validateSecurityContext = useCallback(async (): Promise<boolean> => {
    try {
      // Check interaction rate limiting
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recentInteractions = interactionTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
      
      if (recentInteractions.length > MENU_SECURITY.MAX_INTERACTIONS_PER_MINUTE) {
        securityViolationCountRef.current += 1;
        console.warn('🔒 Context menu rate limit exceeded');
        return false;
      }
      
      // Check for suspicious behavior patterns
      if (recentInteractions.length > MENU_SECURITY.SUSPICIOUS_BEHAVIOR_THRESHOLD) {
        const intervals = [];
        for (let i = 1; i < recentInteractions.length; i++) {
          intervals.push(recentInteractions[i] - recentInteractions[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avgInterval < 100) { // Less than 100ms between interactions
          securityViolationCountRef.current += 1;
          console.warn('🔒 Suspicious context menu behavior detected');
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Security validation failed:', error);
      securityViolationCountRef.current += 1;
      return false;
    }
  }, [interactionTimestamps]);
  
  // ================================
  // AUDIT & COMPLIANCE
  // ================================
  
  const auditAction = useCallback((action: string, trigger: 'mouse' | 'keyboard' | 'programmatic', position: { x: number; y: number }): void => {
    const auditEntry: ContextMenuAudit = {
      actionId: `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      trigger,
      position,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      securityFlags: isSecure ? [] : ['rate_limit_warning'],
    };
    
    setAuditLog(prev => [...prev, auditEntry].slice(-100)); // Keep last 100 entries
    
    console.log(`📋 Context menu audit: ${action} via ${trigger} at (${position.x}, ${position.y})`);
  }, [isSecure]);
  
  const exportAuditLog = useCallback((): readonly ContextMenuAudit[] => {
    return auditLog;
  }, [auditLog]);
  
  // ================================
  // ACCESSIBILITY FEATURES
  // ================================
  
  const announceToScreenReader = useCallback((message: string): void => {
    if (!accessibilityEnabled) return;
    
    // Create or update ARIA live region
    let liveRegion = document.getElementById('syntari-context-menu-announcer');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'syntari-context-menu-announcer';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    
    // Clear and set new message
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion!.textContent = message;
    }, CONTEXT_MENU_CONFIG.ACCESSIBILITY_DELAY);
    
    console.log(`🔊 Screen reader: ${message}`);
  }, [accessibilityEnabled]);
  
  const setAccessibilityMode = useCallback((enabled: boolean): void => {
    setAccessibilityEnabled(enabled);
    setContextMenu(prev => ({ ...prev, accessibilityMode: enabled }));
    
    if (enabled) {
      announceToScreenReader('Accessibility mode enabled for context menus');
    }
    
    console.log(`♿ Accessibility mode: ${enabled ? 'enabled' : 'disabled'}`);
  }, [announceToScreenReader]);
  
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent): boolean => {
    if (!contextMenu.visible) return false;
    
    keyboardInteractionsRef.current += 1;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        hideContextMenu('keyboard_escape');
        announceToScreenReader('Context menu closed');
        return true;
        
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        // Would be handled by menu component
        announceToScreenReader(`Navigating ${event.key === 'ArrowDown' ? 'down' : 'up'} in menu`);
        return true;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Would trigger selected item
        announceToScreenReader('Menu item activated');
        return true;
        
      case 'Tab':
        event.preventDefault();
        hideContextMenu('keyboard_tab');
        return true;
        
      default:
        return false;
    }
  }, [contextMenu.visible, announceToScreenReader]);
  
  // ================================
  // PERFORMANCE MONITORING
  // ================================
  
  const updatePerformanceMetrics = useCallback((): void => {
    const displayTime = performance.now() - displayStartTimeRef.current;
    
    setMetrics(prev => {
      const newTotalInteractions = totalInteractionsRef.current;
      const newAverageDisplayTime = prev.totalInteractions > 0 
        ? (prev.averageDisplayTime * prev.totalInteractions + displayTime) / newTotalInteractions
        : displayTime;
      
      const keyboardPercentage = newTotalInteractions > 0 
        ? (keyboardInteractionsRef.current / newTotalInteractions) * 100 
        : 0;
      
      return {
        totalInteractions: newTotalInteractions,
        averageDisplayTime: newAverageDisplayTime,
        keyboardUsagePercentage: keyboardPercentage,
        securityViolations: securityViolationCountRef.current,
        performanceWarnings: displayTime > 1000 ? prev.performanceWarnings + 1 : prev.performanceWarnings,
      };
    });
    
    if (displayTime > 1000) {
      console.warn(`⚠️ Context menu displayed for ${displayTime}ms (performance warning)`);
    }
  }, []);
  
  const resetMetrics = useCallback((): void => {
    setMetrics({
      totalInteractions: 0,
      averageDisplayTime: 0,
      keyboardUsagePercentage: 0,
      securityViolations: 0,
      performanceWarnings: 0,
    });
    
    // Reset refs
    keyboardInteractionsRef.current = 0;
    totalInteractionsRef.current = 0;
    securityViolationCountRef.current = 0;
    
    console.log('📊 Context menu metrics reset');
  }, []);
  
  // ================================
  // CORE MENU FUNCTIONALITY
  // ================================
  
  const calculateOptimalPosition = useCallback((x: number, y: number): { x: number; y: number } => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // Horizontal positioning with enhanced logic
    if (x + CONTEXT_MENU_CONFIG.MENU_WIDTH > viewportWidth) {
      adjustedX = Math.max(
        CONTEXT_MENU_CONFIG.MIN_MARGIN,
        viewportWidth - CONTEXT_MENU_CONFIG.MENU_WIDTH - CONTEXT_MENU_CONFIG.MIN_MARGIN
      );
    }
    
    // Vertical positioning with enhanced logic
    if (y + CONTEXT_MENU_CONFIG.MENU_HEIGHT > viewportHeight) {
      adjustedY = Math.max(
        CONTEXT_MENU_CONFIG.MIN_MARGIN,
        viewportHeight - CONTEXT_MENU_CONFIG.MENU_HEIGHT - CONTEXT_MENU_CONFIG.MIN_MARGIN
      );
    }
    
    // Ensure minimum margins
    adjustedX = Math.max(CONTEXT_MENU_CONFIG.MIN_MARGIN, adjustedX);
    adjustedY = Math.max(CONTEXT_MENU_CONFIG.MIN_MARGIN, adjustedY);
    
    return { x: adjustedX, y: adjustedY };
  }, []);
  
  const showContextMenu = useCallback(async (
    x: number, 
    y: number, 
    trigger: 'mouse' | 'keyboard' | 'programmatic' = 'mouse'
  ): Promise<void> => {
    // Security validation
    const isSecureContext = await validateSecurityContext();
    if (!isSecureContext) {
      console.warn('🔒 Context menu blocked due to security concerns');
      return;
    }
    
    // Performance tracking
    displayStartTimeRef.current = performance.now();
    totalInteractionsRef.current += 1;
    
    // Update interaction timestamps for rate limiting
    setInteractionTimestamps(prev => [...prev, Date.now()].slice(-MENU_SECURITY.MAX_INTERACTIONS_PER_MINUTE));
    
    // Calculate optimal position
    const position = calculateOptimalPosition(x, y);
    
    // Update state
    setContextMenu({
      visible: true,
      x: position.x,
      y: position.y,
      trigger,
      timestamp: Date.now(),
      accessibilityMode: accessibilityEnabled,
    });
    
    // Audit the action
    auditAction('context_menu_shown', trigger, position);
    
    // Accessibility announcements
    if (accessibilityEnabled) {
      announceToScreenReader(`Context menu opened at position ${position.x}, ${position.y}`);
    }
    
    console.log(`📋 Context menu shown: ${trigger} trigger at (${position.x}, ${position.y})`);
  }, [validateSecurityContext, calculateOptimalPosition, accessibilityEnabled, auditAction, announceToScreenReader]);
  
  const hideContextMenu = useCallback((reason: string = 'manual'): void => {
    if (!contextMenu.visible) return;
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Update state
    setContextMenu(prev => ({
      ...prev,
      visible: false,
      x: 0,
      y: 0,
      timestamp: Date.now(),
    }));
    
    // Audit the action
    auditAction('context_menu_hidden', contextMenu.trigger, { x: contextMenu.x, y: contextMenu.y });
    
    // Accessibility announcements
    if (accessibilityEnabled) {
      announceToScreenReader(`Context menu closed: ${reason}`);
    }
    
    console.log(`📋 Context menu hidden: ${reason}`);
  }, [contextMenu.visible, contextMenu.trigger, contextMenu.x, contextMenu.y, updatePerformanceMetrics, auditAction, accessibilityEnabled, announceToScreenReader]);
  
  const handleContextMenu = useCallback((event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    
    // Validate event origin for security
    if (!event.isTrusted) {
      console.warn('🔒 Untrusted context menu event blocked');
      securityViolationCountRef.current += 1;
      return;
    }
    
    showContextMenu(event.clientX, event.clientY, 'mouse');
  }, [showContextMenu]);
  
  // ================================
  // LIFECYCLE & EVENT MANAGEMENT
  // ================================
  
  useEffect(() => {
    if (!contextMenu.visible) return;
    
    // Enhanced event listeners for enterprise functionality
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      // Convert to React.KeyboardEvent-like object for consistency
      const reactEvent = {
        key: event.key,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      } as React.KeyboardEvent;
      
      handleKeyboardNavigation(reactEvent);
    };
    
    const handleDocumentClick = (event: MouseEvent) => {
      if (!event.isTrusted) {
        securityViolationCountRef.current += 1;
        return;
      }
      
      // Check if click is outside menu
      const target = event.target as Element;
      if (!menuElementRef.current?.contains(target)) {
        hideContextMenu('outside_click');
      }
    };
    
    const handleScroll = () => {
      hideContextMenu('scroll');
    };
    
    const handleResize = () => {
      hideContextMenu('window_resize');
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideContextMenu('tab_hidden');
      }
    };
    
    // Add event listeners with options for performance
    document.addEventListener('keydown', handleDocumentKeyDown, { capture: true, passive: false });
    document.addEventListener('click', handleDocumentClick, { capture: true, passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    
    // Focus management for accessibility
    if (accessibilityEnabled && menuElementRef.current) {
      menuElementRef.current.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, { capture: true } as any);
      document.removeEventListener('click', handleDocumentClick, { capture: true } as any);
      document.removeEventListener('scroll', handleScroll, { capture: true } as any);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [contextMenu.visible, handleKeyboardNavigation, hideContextMenu, accessibilityEnabled]);
  
  // Performance monitoring setup
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 100) { // More than 100ms
            console.warn(`⚠️ Performance: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });
      
      performanceObserverRef.current.observe({ entryTypes: ['measure', 'navigation'] });
    }
    
    return () => {
      performanceObserverRef.current?.disconnect();
    };
  }, []);
  
  // Accessibility detection
  useEffect(() => {
    const detectAccessibilityPreference = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      if (prefersReducedMotion || highContrast) {
        setAccessibilityMode(true);
      }
    };
    
    detectAccessibilityPreference();
    
    // Listen for changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    reducedMotionQuery.addEventListener('change', detectAccessibilityPreference);
    contrastQuery.addEventListener('change', detectAccessibilityPreference);
    
    return () => {
      reducedMotionQuery.removeEventListener('change', detectAccessibilityPreference);
      contrastQuery.removeEventListener('change', detectAccessibilityPreference);
    };
  }, [setAccessibilityMode]);
  
  // ================================
  // ENTERPRISE RETURN INTERFACE
  // ================================
  
  return {
    // Core State
    contextMenu,
    metrics,
    
    // Primary Actions
    showContextMenu,
    hideContextMenu,
    handleContextMenu,
    
    // Accessibility Features
    handleKeyboardNavigation,
    announceToScreenReader,
    setAccessibilityMode,
    
    // Enterprise Features
    validateSecurityContext,
    exportAuditLog,
    resetMetrics,
    
    // Computed Properties
    isSecure,
    performanceScore,
    accessibilityCompliant,
  };
}; 