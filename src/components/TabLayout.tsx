// Syntari AI IDE - Enterprise Tab Management System
// Advanced tab system with performance optimization, accessibility, and keyboard integration

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useShortcut } from '../hooks/useKeyboardShortcuts';
import { announceShortcut } from '../utils/keyboardUtils';

// ================================
// ENHANCED TYPES
// ================================

export interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: string;
  closeable?: boolean;
  modified?: boolean;
  pinned?: boolean;
  filePath?: string;
  lastAccessed?: number;
  metadata?: Record<string, any>;
  isDirty?: boolean;
  size?: number; // For memory/performance tracking
}

export interface TabGroup {
  id: string;
  name: string;
  tabs: Tab[];
  activeTabId: string;
  collapsed?: boolean;
}

export interface SplitView {
  id: string;
  orientation: 'horizontal' | 'vertical';
  tabs: Tab[];
  activeTabId: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
}

export interface TabMetrics {
  totalTabs: number;
  pinnedTabs: number;
  modifiedTabs: number;
  memoryUsage: number;
  averageTabSize: number;
}

interface TabLayoutProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onUnsavedChangesWarning?: (tabId: string) => Promise<boolean>;
  className?: string;
  enableKeyboardNavigation?: boolean;
  enableContextMenu?: boolean;
  enableVirtualScrolling?: boolean;
  maxVisibleTabs?: number;
  splitViews?: SplitView[];
  onSplitView?: (orientation: 'horizontal' | 'vertical') => void;
  onTabDoubleClick?: (tabId: string) => void;
  onTabMiddleClick?: (tabId: string) => void;
  showTabMetrics?: boolean;
  enableTabGroups?: boolean;
  persistState?: boolean;
  stateKey?: string;
}

interface TabContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  tabId: string;
  onClose: () => void;
  onAction: (action: string, tabId: string) => void;
  isPinned?: boolean;
  hasUnsavedChanges?: boolean;
  filePath?: string;
  tabIndex?: number;
  totalTabs?: number;
  isCloseable?: boolean;
}

// ================================
// PERFORMANCE OPTIMIZED TAB CONTEXT MENU
// ================================

const TabContextMenu: React.FC<TabContextMenuProps> = React.memo(({
  visible,
  x,
  y,
  tabId,
  onClose,
  onAction,
  isPinned = false,
  hasUnsavedChanges = false,
  filePath,
  tabIndex = 0,
  totalTabs = 0,
  isCloseable = true,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Focus management for accessibility
    if (menuRef.current) {
      const firstButton = menuRef.current.querySelector('button:not([disabled])') as HTMLButtonElement;
      firstButton?.focus();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  const menuItems = useMemo(() => {
    const items = [];
    
    // Only show close-related options for closeable tabs
    if (isCloseable) {
      items.push(
        { id: 'close', label: 'Close Tab', disabled: false, hotkey: 'Ctrl+W' },
        { id: 'close-others', label: 'Close Others', disabled: totalTabs <= 1 },
        { id: 'close-to-right', label: 'Close Tabs to the Right', disabled: tabIndex >= totalTabs - 1 },
        { id: 'close-all', label: 'Close All Tabs', disabled: totalTabs === 0 },
        { id: 'separator1', label: '---', disabled: true }
      );
    }
    
    // Pin/unpin for system tabs (but they can't be closed)
    if (isCloseable) {
      items.push({ id: 'pin', label: isPinned ? 'Unpin Tab' : 'Pin Tab', disabled: false });
    }
    
    // Duplicate only for file tabs
    if (filePath && isCloseable) {
      items.push({ id: 'duplicate', label: 'Duplicate Tab', disabled: !filePath });
    }
    
    // Add separator before split/copy actions if we have previous items
    if (items.length > 0) {
      items.push({ id: 'separator2', label: '---', disabled: true });
    }
    
    // Split and copy actions (available for all tabs)
    items.push(
      { id: 'split-horizontal', label: 'Split Right', disabled: false, hotkey: 'Ctrl+\\' },
      { id: 'split-vertical', label: 'Split Down', disabled: false, hotkey: 'Ctrl+Shift+\\' }
    );
    
    // File-specific actions only for file tabs
    if (filePath) {
      items.push(
        { id: 'separator3', label: '---', disabled: true },
        { id: 'copy-path', label: 'Copy File Path', disabled: !filePath },
        { id: 'copy-relative-path', label: 'Copy Relative Path', disabled: !filePath },
        { id: 'reveal-explorer', label: 'Reveal in File Explorer', disabled: !filePath }
      );
    }
    
    return items;
  }, [isPinned, filePath, tabIndex, totalTabs, isCloseable]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-vscode-bg border border-vscode-border shadow-lg rounded-sm py-1 min-w-[220px]"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Tab context menu"
    >
      {menuItems.map((item, index) => (
        item.label === '---' ? (
          <div key={item.id} className="border-t border-vscode-border my-1" role="separator" />
        ) : (
          <button
            key={item.id}
            onClick={() => {
              onAction(item.id, tabId);
              onClose();
              announceShortcut('Tab Context Menu', item.label);
            }}
            disabled={item.disabled}
            className={`
              w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between
              ${item.disabled 
                ? 'text-vscode-fg-muted cursor-default' 
                : 'text-vscode-fg hover:bg-vscode-list-hover cursor-pointer focus:bg-vscode-list-hover focus:outline-none'
              }
            `}
            role="menuitem"
            tabIndex={item.disabled ? -1 : 0}
            aria-disabled={item.disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!item.disabled) {
                  onAction(item.id, tabId);
                  onClose();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextButton = e.currentTarget.parentElement?.children[index + 2] as HTMLButtonElement;
                nextButton?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevButton = e.currentTarget.parentElement?.children[index] as HTMLButtonElement;
                prevButton?.focus();
              }
            }}
          >
            <span className="flex items-center">
              {item.label}
              {hasUnsavedChanges && item.id === 'close' && (
                <span className="ml-2 text-xs text-yellow-500" title="Unsaved changes">●</span>
              )}
            </span>
            {item.hotkey && (
              <span className="text-xs text-vscode-fg-muted ml-4">{item.hotkey}</span>
            )}
          </button>
        )
      ))}
    </div>
  );
});

TabContextMenu.displayName = 'TabContextMenu';

// ================================
// VIRTUAL TAB RENDERER FOR PERFORMANCE
// ================================

interface VirtualTabRendererProps {
  tabs: Tab[];
  activeTabId: string;
  maxVisibleTabs: number;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabContextMenu: (e: React.MouseEvent, tabId: string) => void;
  onTabDrag: (tabId: string) => void;
  draggedTab: string | null;
  dragOverIndex: number | null;
  onTabDragEnd: () => void;
  onTabDragLeave: () => void;
  onTabDragEnter: (e: React.DragEvent, index: number) => void;
  onTabDragOver: (e: React.DragEvent, index: number) => void;
  onTabDropComplete: (e: React.DragEvent, dropIndex: number) => void;
}

const VirtualTabRenderer: React.FC<VirtualTabRendererProps> = React.memo(({
  tabs,
  activeTabId,
  maxVisibleTabs,
  onTabClick,
  onTabClose,
  onTabContextMenu,
  onTabDrag,
  draggedTab,
  dragOverIndex,
  onTabDragEnd,
  onTabDragLeave,
  onTabDragEnter,
  onTabDragOver,
  onTabDropComplete,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate visible tab range
  const { startIndex, endIndex, canScrollLeft, canScrollRight } = useMemo(() => {
    const start = Math.max(0, scrollOffset);
    const end = Math.min(tabs.length, start + maxVisibleTabs);
    return {
      startIndex: start,
      endIndex: end,
      canScrollLeft: start > 0,
      canScrollRight: end < tabs.length
    };
  }, [tabs.length, scrollOffset, maxVisibleTabs]);

  const visibleTabs = useMemo(() => {
    return tabs.slice(startIndex, endIndex);
  }, [tabs, startIndex, endIndex]);

  const scrollLeft = useCallback(() => {
    setScrollOffset(prev => Math.max(0, prev - 1));
  }, []);

  const scrollRight = useCallback(() => {
    setScrollOffset(prev => Math.min(tabs.length - maxVisibleTabs, prev + 1));
  }, [tabs.length, maxVisibleTabs]);

  // Auto-scroll to active tab
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);
    if (activeIndex !== -1) {
      if (activeIndex < startIndex) {
        setScrollOffset(activeIndex);
      } else if (activeIndex >= endIndex) {
        setScrollOffset(activeIndex - maxVisibleTabs + 1);
      }
    }
  }, [activeTabId, tabs, startIndex, endIndex, maxVisibleTabs]);

  return (
    <div className="flex items-center flex-1 min-w-0">
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="px-2 py-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover transition-colors flex-shrink-0"
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
        >
          ‹
        </button>
      )}

      {/* Visible tabs */}
      <div 
        ref={scrollRef}
        className="flex items-center flex-1 min-w-0 overflow-hidden"
      >
        {visibleTabs.map((tab, index) => {
          const globalIndex = startIndex + index;
          const isActive = tab.id === activeTabId;
          const isDragged = draggedTab === tab.id;
          const isDropTarget = dragOverIndex === globalIndex;

          return (
            <div
              key={tab.id}
              className={`
                group relative flex items-center px-3 py-2 border-r border-vscode-border cursor-pointer transition-all duration-150 min-w-0
                ${isActive 
                  ? 'bg-vscode-tab-active text-vscode-fg border-b-2 border-b-vscode-accent' 
                  : 'bg-vscode-tab-inactive text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg'
                }
                ${isDragged ? 'opacity-50 transform scale-95' : ''}
                ${isDropTarget ? 'bg-vscode-list-active border-l-2 border-l-vscode-accent' : ''}
                ${tab.pinned ? 'border-l-2 border-l-blue-500' : ''}
              `}
              onClick={() => onTabClick(tab.id)}
              onContextMenu={(e) => onTabContextMenu(e, tab.id)}
              onDragStart={(e) => {
                onTabDrag(tab.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tab.id);
              }}
              onDragEnd={onTabDragEnd}
              onDragEnter={(e) => onTabDragEnter(e, globalIndex)}
              onDragOver={(e) => onTabDragOver(e, globalIndex)}
              onDragLeave={onTabDragLeave}
              onDrop={(e) => onTabDropComplete(e, globalIndex)}
              draggable={!tab.pinned}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.title}${tab.modified ? ' (modified)' : ''}${tab.pinned ? ' (pinned)' : ''}`}
              tabIndex={isActive ? 0 : -1}
            >
              {/* Tab Icon */}
              {tab.icon && (
                <span className="mr-2 flex-shrink-0 text-sm" role="img" aria-hidden="true">
                  {tab.icon}
                </span>
              )}

              {/* Tab Title */}
              <span className="truncate flex-1 min-w-0" title={tab.title}>
                {tab.title}
              </span>

              {/* Modified Indicator */}
              {tab.modified && (
                <span 
                  className="ml-2 text-xs text-yellow-500 flex-shrink-0" 
                  title="Unsaved changes"
                  aria-label="Has unsaved changes"
                >
                  ●
                </span>
              )}

              {/* Pin Indicator */}
              {tab.pinned && (
                <span 
                  className="ml-1 text-xs text-blue-500 flex-shrink-0" 
                  title="Pinned tab"
                  aria-label="Pinned"
                >
                  📌
                </span>
              )}

              {/* Close Button */}
              {tab.closeable && !tab.pinned && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="ml-2 w-4 h-4 flex items-center justify-center rounded hover:bg-vscode-button-hover opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Close tab"
                  aria-label={`Close ${tab.title}`}
                >
                  <span className="text-xs text-vscode-fg-muted hover:text-vscode-fg">×</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="px-2 py-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover transition-colors flex-shrink-0"
          title="Scroll tabs right"
          aria-label="Scroll tabs right"
        >
          ›
        </button>
      )}
    </div>
  );
});

VirtualTabRenderer.displayName = 'VirtualTabRenderer';

// ================================
// ENHANCED TAB LAYOUT COMPONENT
// ================================

export const TabLayout: React.FC<TabLayoutProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabReorder,
  onUnsavedChangesWarning,
  onNewTab,
  onSplitView,
  onTabDoubleClick,
  className,
  enableContextMenu = true,
  enableVirtualScrolling = false,
  maxVisibleTabs = 10,
  showTabMetrics = false,
  persistState = false,
  stateKey = 'tab-layout'
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  }>({ visible: false, x: 0, y: 0, tabId: '' });

  // Enhanced keyboard shortcuts with business context
  useShortcut('tabManagement', 'nextTab', useCallback((e) => {
    e.preventDefault?.();
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    if (tabs[nextIndex]) {
      onTabChange(tabs[nextIndex].id);
      announceShortcut('Next Tab', `Switched to ${tabs[nextIndex].title}`);
    }
  }, [tabs, activeTabId, onTabChange]));

  useShortcut('tabManagement', 'previousTab', useCallback((e) => {
    e.preventDefault?.();
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    if (tabs[prevIndex]) {
      onTabChange(tabs[prevIndex].id);
      announceShortcut('Previous Tab', `Switched to ${tabs[prevIndex].title}`);
    }
  }, [tabs, activeTabId, onTabChange]));

  useShortcut('tabManagement', 'closeTab', useCallback((e) => {
    e.preventDefault?.();
    if (activeTabId && onTabClose) {
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      if (activeTab) {
        announceShortcut('Close Tab', `Closing ${activeTab.title}`);
        handleTabClose(activeTabId);
      }
    }
  }, [activeTabId, onTabClose, tabs]));

  useShortcut('tabManagement', 'newTab', useCallback((e) => {
    e.preventDefault?.();
    if (onNewTab) {
      onNewTab();
      announceShortcut('New Tab', 'Created new tab');
    }
  }, [onNewTab]));

  // Enhanced tab close handler with unsaved changes protection
  const handleTabClose = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Prevent closing system tabs (File Explorer, AI Assistant)
    if (tab.closeable === false) {
      console.log('🔒 Cannot close system tab:', tab.title);
      return;
    }

    try {
      // Check for unsaved changes
      if (tab.modified && onUnsavedChangesWarning) {
        const shouldClose = await onUnsavedChangesWarning(tabId);
        if (!shouldClose) {
          return;
        }
      }

      onTabClose?.(tabId);
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  }, [tabs, onTabClose, onUnsavedChangesWarning]);

  // Context menu handler with enhanced actions
  const handleContextMenuAction = useCallback((action: string, tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    switch (action) {
      case 'close':
        // Only allow closing if tab is closeable
        if (tab.closeable !== false) {
          handleTabClose(tabId);
        }
        break;
      case 'close-others':
        tabs.forEach(t => {
          if (t.id !== tabId && !t.pinned && t.closeable !== false) {
            handleTabClose(t.id);
          }
        });
        break;
      case 'close-to-right': {
        const fromIndex = tabs.findIndex(t => t.id === tabId);
        tabs.slice(fromIndex + 1).forEach(t => {
          if (!t.pinned && t.closeable !== false) {
            handleTabClose(t.id);
          }
        });
        break;
      }
      case 'close-all':
        tabs.forEach(t => {
          if (!t.pinned && t.closeable !== false) {
            handleTabClose(t.id);
          }
        });
        break;
      case 'pin':
        // Pin/unpin functionality would be implemented by parent
        break;
      case 'duplicate':
        if (tab.filePath) {
          // Duplicate tab functionality
        }
        break;
      case 'split-horizontal':
        onSplitView?.('horizontal');
        break;
      case 'split-vertical':
        onSplitView?.('vertical');
        break;
      case 'copy-path':
        if (tab.filePath) {
          navigator.clipboard.writeText(tab.filePath);
        }
        break;
      case 'copy-relative-path':
        if (tab.filePath) {
          // Implementation would depend on workspace root
          navigator.clipboard.writeText(tab.filePath);
        }
        break;
      case 'reveal-explorer':
        if (tab.filePath) {
          // Reveal in explorer functionality
        }
        break;
    }
  }, [tabs, handleTabClose, onSplitView]);

  // Context menu trigger
  const handleTabContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    if (!enableContextMenu) return;
    
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  }, [enableContextMenu]);

  // Drag and drop handlers
  const handleTabDrag = useCallback((tabId: string) => {
    setDraggedTab(tabId);
  }, []);

  const handleTabDragEnd = useCallback(() => {
    if (draggedTab && dragOverIndex !== null && onTabReorder) {
      const fromIndex = tabs.findIndex(tab => tab.id === draggedTab);
      if (fromIndex !== -1 && fromIndex !== dragOverIndex) {
        onTabReorder(fromIndex, dragOverIndex);
      }
    }
    // Reset drag state
    setDraggedTab(null);
    setDragOverIndex(null);
  }, [draggedTab, dragOverIndex, tabs, onTabReorder]);

  const handleTabDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleTabDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleTabDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleTabDropComplete = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedTab && onTabReorder) {
      const fromIndex = tabs.findIndex(tab => tab.id === draggedTab);
      if (fromIndex !== -1 && fromIndex !== dropIndex) {
        onTabReorder(fromIndex, dropIndex);
      }
    }
    
    // Reset drag state
    setDraggedTab(null);
    setDragOverIndex(null);
  }, [draggedTab, tabs, onTabReorder]);

  // Tab metrics calculation
  const tabMetrics = useMemo((): TabMetrics => {
    return {
      totalTabs: tabs.length,
      pinnedTabs: tabs.filter(t => t.pinned).length,
      modifiedTabs: tabs.filter(t => t.modified).length,
      memoryUsage: tabs.reduce((sum, tab) => sum + (tab.size || 0), 0),
      averageTabSize: tabs.length > 0 ? tabs.reduce((sum, tab) => sum + (tab.size || 0), 0) / tabs.length : 0
    };
  }, [tabs]);

  // State persistence
  useEffect(() => {
    if (persistState && stateKey) {
      const state = {
        activeTabId,
        tabOrder: tabs.map(t => t.id),
        timestamp: Date.now()
      };
      localStorage.setItem(stateKey, JSON.stringify(state));
    }
  }, [persistState, stateKey, activeTabId, tabs]);

  return (
    <div 
      className={`flex flex-col h-full bg-vscode-bg ${className}`}
      role="tabpanel"
      aria-label="Tab layout"
    >
      {/* Tab Bar */}
      <div className="flex items-center bg-vscode-tab-bar border-b border-vscode-border min-h-[35px]">
        {enableVirtualScrolling && tabs.length > maxVisibleTabs ? (
          <VirtualTabRenderer
            tabs={tabs}
            activeTabId={activeTabId}
            maxVisibleTabs={maxVisibleTabs}
            onTabClick={onTabChange}
            onTabClose={handleTabClose}
            onTabContextMenu={handleTabContextMenu}
            onTabDrag={handleTabDrag}
            draggedTab={draggedTab}
            dragOverIndex={dragOverIndex}
            onTabDragEnd={handleTabDragEnd}
            onTabDragLeave={handleTabDragLeave}
            onTabDragEnter={handleTabDragEnter}
            onTabDragOver={handleTabDragOver}
            onTabDropComplete={handleTabDropComplete}
          />
        ) : (
          <div className="flex items-center flex-1 min-w-0">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTabId;
              const isDragged = draggedTab === tab.id;
              const isDropTarget = dragOverIndex === index;

              return (
                <div
                  key={tab.id}
                  className={`
                    group relative flex items-center px-3 py-2 border-r border-vscode-border cursor-pointer transition-all duration-150 min-w-0
                    ${isActive 
                      ? 'bg-vscode-tab-active text-vscode-fg border-b-2 border-b-vscode-accent' 
                      : 'bg-vscode-tab-inactive text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg'
                    }
                    ${isDragged ? 'opacity-50 transform scale-95' : ''}
                    ${isDropTarget ? 'bg-vscode-list-active border-l-2 border-l-vscode-accent' : ''}
                    ${tab.pinned ? 'border-l-2 border-l-blue-500' : ''}
                  `}
                  onClick={() => onTabChange(tab.id)}
                  onDoubleClick={() => onTabDoubleClick?.(tab.id)}
                  onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                  onDragStart={(e) => {
                    handleTabDrag(tab.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', tab.id);
                  }}
                  onDragEnd={handleTabDragEnd}
                  onDragEnter={(e) => handleTabDragEnter(e, index)}
                  onDragOver={(e) => handleTabDragOver(e, index)}
                  onDragLeave={handleTabDragLeave}
                  onDrop={(e) => handleTabDropComplete(e, index)}
                  draggable={!tab.pinned}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${tab.title}${tab.modified ? ' (modified)' : ''}${tab.pinned ? ' (pinned)' : ''}`}
                  tabIndex={isActive ? 0 : -1}
                >
                  {/* Tab Icon */}
                  {tab.icon && (
                    <span className="mr-2 flex-shrink-0 text-sm" role="img" aria-hidden="true">
                      {tab.icon}
                    </span>
                  )}

                  {/* Tab Title */}
                  <span className="truncate flex-1 min-w-0" title={tab.title}>
                    {tab.title}
                  </span>

                  {/* Modified Indicator */}
                  {tab.modified && (
                    <span 
                      className="ml-2 text-xs text-yellow-500 flex-shrink-0" 
                      title="Unsaved changes"
                      aria-label="Has unsaved changes"
                    >
                      ●
                    </span>
                  )}

                  {/* Pin Indicator */}
                  {tab.pinned && (
                    <span 
                      className="ml-1 text-xs text-blue-500 flex-shrink-0" 
                      title="Pinned tab"
                      aria-label="Pinned"
                    >
                      📌
                    </span>
                  )}

                  {/* Close Button */}
                  {tab.closeable && !tab.pinned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabClose(tab.id);
                      }}
                      className="ml-2 w-4 h-4 flex items-center justify-center rounded hover:bg-vscode-button-hover opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Close tab"
                      aria-label={`Close ${tab.title}`}
                    >
                      <span className="text-xs text-vscode-fg-muted hover:text-vscode-fg">×</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Tab Actions */}
        <div className="flex items-center border-l border-vscode-border">
          {/* New Tab Button */}
          {onNewTab && (
            <button
              onClick={onNewTab}
              className="px-3 py-2 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="New Tab (Ctrl+T)"
              aria-label="Create new tab"
            >
              <span className="text-sm">+</span>
            </button>
          )}
          
          {/* Split View Button */}
          {onSplitView && (
            <button
              onClick={() => onSplitView('horizontal')}
              className="px-3 py-2 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="Split Editor Right (Ctrl+\)"
              aria-label="Split editor right"
            >
              <span className="text-sm">⫘</span>
            </button>
          )}

          {/* Tab Metrics */}
          {showTabMetrics && (
            <div className="px-3 py-1 text-xs text-vscode-fg-muted border-l border-vscode-border" title={`${tabMetrics.totalTabs} tabs, ${tabMetrics.modifiedTabs} modified`}>
              {tabMetrics.totalTabs}
              {tabMetrics.modifiedTabs > 0 && (
                <span className="text-yellow-500 ml-1">●{tabMetrics.modifiedTabs}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <div 
            key={tab.id}
            className={`h-full ${tab.id === activeTabId ? 'block' : 'hidden'}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
          >
            {tab.content}
          </div>
        ))}
        
        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full text-vscode-fg-muted">
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <p>No tabs open</p>
              <div className="mt-4 text-xs text-vscode-fg-muted space-y-1">
                <div>Ctrl+T - New tab</div>
                <div>Ctrl+Tab - Switch tabs</div>
                <div>Ctrl+W - Close tab</div>
                <div>Right-click - Context menu</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <TabContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        tabId={contextMenu.tabId}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        onAction={handleContextMenuAction}
        isPinned={tabs.find(t => t.id === contextMenu.tabId)?.pinned}
        hasUnsavedChanges={tabs.find(t => t.id === contextMenu.tabId)?.modified}
        filePath={tabs.find(t => t.id === contextMenu.tabId)?.filePath}
        tabIndex={tabs.findIndex(t => t.id === contextMenu.tabId)}
        totalTabs={tabs.length}
        isCloseable={tabs.find(t => t.id === contextMenu.tabId)?.closeable ?? true}
      />
    </div>
  );
};

// ================================
// ENHANCED TAB MANAGEMENT HOOKS
// ================================

export const useTabManager = (initialTabs: Tab[] = []) => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(
    initialTabs.length > 0 ? initialTabs[0].id : ''
  );

  const addTab = useCallback((tab: Tab) => {
    setTabs(prev => {
      // Check if tab already exists
      const existingIndex = prev.findIndex(t => t.id === tab.id);
      if (existingIndex !== -1) {
        // Tab exists, just switch to it and update lastAccessed
        setActiveTabId(tab.id);
        return prev.map(t => 
          t.id === tab.id 
            ? { ...t, lastAccessed: Date.now() }
            : t
        );
      }
      
      // Add new tab with metadata
      const newTab = {
        ...tab,
        lastAccessed: Date.now(),
        size: tab.size || 0,
        metadata: tab.metadata || {}
      };
      
      // Pinned tabs go first, then regular tabs
      if (tab.pinned) {
        // Find the last pinned tab position manually for TypeScript compatibility
        let lastPinnedIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].pinned) {
            lastPinnedIndex = i;
            break;
          }
        }
        const newTabs = [...prev];
        newTabs.splice(lastPinnedIndex + 1, 0, newTab);
        return newTabs;
      } else {
        return [...prev, newTab];
      }
    });
    setActiveTabId(tab.id);
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // Smart tab selection after closing
      if (activeTabId === tabId && newTabs.length > 0) {
        const closingIndex = prev.findIndex(tab => tab.id === tabId);
        
        // Select most recently accessed tab first
        const recentTab = newTabs
          .filter(t => t.lastAccessed)
          .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
        
        if (recentTab) {
          setActiveTabId(recentTab.id);
        } else {
          // Fallback to positional logic
          const newActiveIndex = Math.min(closingIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        }
      } else if (newTabs.length === 0) {
        setActiveTabId('');
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, ...updates, lastAccessed: Date.now() }
        : tab
    ));
  }, []);

  const switchToTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, lastAccessed: Date.now() }
        : tab
    ));
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [removed] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, removed);
      return newTabs;
    });
  }, []);

  const pinTab = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab
    ));
  }, []);

  const closeOtherTabs = useCallback((keepTabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id === keepTabId || tab.pinned));
    setActiveTabId(keepTabId);
  }, []);

  const closeTabsToRight = useCallback((fromTabId: string) => {
    setTabs(prev => {
      const fromIndex = prev.findIndex(tab => tab.id === fromTabId);
      if (fromIndex === -1) return prev;
      
      return prev.filter((tab, index) => index <= fromIndex || tab.pinned);
    });
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs(prev => prev.filter(tab => tab.pinned));
    
    const remainingTabs = tabs.filter(tab => tab.pinned);
    if (remainingTabs.length > 0) {
      setActiveTabId(remainingTabs[0].id);
    } else {
      setActiveTabId('');
    }
  }, [tabs]);

  const getTabById = useCallback((tabId: string) => {
    return tabs.find(tab => tab.id === tabId);
  }, [tabs]);

  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTabId);
  }, [tabs, activeTabId]);

  const hasUnsavedChanges = useCallback(() => {
    return tabs.some(tab => tab.modified);
  }, [tabs]);

  const getUnsavedTabs = useCallback(() => {
    return tabs.filter(tab => tab.modified);
  }, [tabs]);

  const getTabMetrics = useCallback((): TabMetrics => {
    return {
      totalTabs: tabs.length,
      pinnedTabs: tabs.filter(t => t.pinned).length,
      modifiedTabs: tabs.filter(t => t.modified).length,
      memoryUsage: tabs.reduce((sum, tab) => sum + (tab.size || 0), 0),
      averageTabSize: tabs.length > 0 ? tabs.reduce((sum, tab) => sum + (tab.size || 0), 0) / tabs.length : 0
    };
  }, [tabs]);

  const duplicateTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.filePath) {
      const duplicatedTab: Tab = {
        ...tab,
        id: `${tab.id}-duplicate-${Date.now()}`,
        title: `${tab.title} (Copy)`,
        pinned: false,
        lastAccessed: Date.now()
      };
      addTab(duplicatedTab);
    }
  }, [tabs, addTab]);

  const getRecentTabs = useCallback((limit: number = 10) => {
    return tabs
      .filter(t => t.lastAccessed)
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
      .slice(0, limit);
  }, [tabs]);

  return {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    updateTab,
    switchToTab,
    reorderTabs,
    pinTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    getTabById,
    getActiveTab,
    hasUnsavedChanges,
    getUnsavedTabs,
    getTabMetrics,
    duplicateTab,
    getRecentTabs,
  };
}; 