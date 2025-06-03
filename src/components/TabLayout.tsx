// Syntari AI IDE - Enhanced Tab Layout Component
// VS Code-style tab system with keyboard navigation, context menus, and split views

import React, { useState, useCallback, useEffect, useRef } from 'react';

// ================================
// TYPES
// ================================

export interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: string;
  closeable?: boolean;
  modified?: boolean;
  pinned?: boolean;
  filePath?: string; // For file tabs
}

export interface SplitView {
  id: string;
  orientation: 'horizontal' | 'vertical';
  tabs: Tab[];
  activeTabId: string;
  size?: number; // Percentage of parent container
}

interface TabLayoutProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onUnsavedChangesWarning?: (tabId: string) => Promise<boolean>; // Returns true if user wants to close
  className?: string;
  enableKeyboardNavigation?: boolean;
  enableContextMenu?: boolean;
  splitViews?: SplitView[];
  onSplitView?: (orientation: 'horizontal' | 'vertical') => void;
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
}

// ================================
// TAB CONTEXT MENU COMPONENT
// ================================

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  visible,
  x,
  y,
  tabId,
  onClose,
  onAction,
  isPinned = false,
  hasUnsavedChanges = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menuItems = [
    { id: 'close', label: 'Close Tab', disabled: false },
    { id: 'close-others', label: 'Close Others', disabled: false },
    { id: 'close-to-right', label: 'Close Tabs to the Right', disabled: false },
    { id: 'close-all', label: 'Close All Tabs', disabled: false },
    { id: 'separator1', label: '---', disabled: true },
    { id: 'pin', label: isPinned ? 'Unpin Tab' : 'Pin Tab', disabled: false },
    { id: 'separator2', label: '---', disabled: true },
    { id: 'split-horizontal', label: 'Split Right', disabled: false },
    { id: 'split-vertical', label: 'Split Down', disabled: false },
    { id: 'separator3', label: '---', disabled: true },
    { id: 'copy-path', label: 'Copy File Path', disabled: false },
    { id: 'reveal-explorer', label: 'Reveal in File Explorer', disabled: false },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-vscode-bg border border-vscode-border shadow-lg rounded-sm py-1 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item) => (
        item.label === '---' ? (
          <div key={item.id} className="border-t border-vscode-border my-1" />
        ) : (
          <button
            key={item.id}
            onClick={() => {
              onAction(item.id, tabId);
              onClose();
            }}
            disabled={item.disabled}
            className={`
              w-full text-left px-3 py-1.5 text-sm transition-colors
              ${item.disabled 
                ? 'text-vscode-fg-muted cursor-default' 
                : 'text-vscode-fg hover:bg-vscode-list-hover cursor-pointer'
              }
            `}
          >
            {item.label}
            {hasUnsavedChanges && item.id === 'close' && (
              <span className="ml-2 text-xs text-yellow-500">*</span>
            )}
          </button>
        )
      ))}
    </div>
  );
};

// ================================
// ENHANCED TAB LAYOUT COMPONENT
// ================================

export const TabLayout: React.FC<TabLayoutProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
  onTabReorder,
  onUnsavedChangesWarning,
  className = '',
  enableKeyboardNavigation = true,
  enableContextMenu = true,
  // splitViews, // Reserved for future split view implementation
  onSplitView,
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  }>({ visible: false, x: 0, y: 0, tabId: '' });

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab - Next tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          onTabChange(tabs[nextIndex].id);
        }
      }
      
      // Ctrl+Shift+Tab - Previous tab
      if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        if (tabs[prevIndex]) {
          onTabChange(tabs[prevIndex].id);
        }
      }
      
      // Ctrl+PageUp - Previous tab
      if (e.ctrlKey && e.key === 'PageUp') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        if (tabs[prevIndex]) {
          onTabChange(tabs[prevIndex].id);
        }
      }
      
      // Ctrl+PageDown - Next tab
      if (e.ctrlKey && e.key === 'PageDown') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          onTabChange(tabs[nextIndex].id);
        }
      }
      
      // Ctrl+W - Close current tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId && onTabClose) {
          handleTabClose(activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, tabs, activeTabId, onTabChange, onTabClose]);

  const handleTabClick = useCallback((tabId: string) => {
    onTabChange(tabId);
  }, [onTabChange]);

  const handleTabClose = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    
    // Check for unsaved changes
    if (tab?.modified && onUnsavedChangesWarning) {
      const shouldClose = await onUnsavedChangesWarning(tabId);
      if (!shouldClose) return;
    }
    
    onTabClose?.(tabId);
  }, [tabs, onTabClose, onUnsavedChangesWarning]);

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

  const handleContextMenuAction = useCallback(async (action: string, tabId: string) => {
    switch (action) {
      case 'close':
        await handleTabClose(tabId);
        break;
        
      case 'close-others':
        const otherTabs = tabs.filter(tab => tab.id !== tabId);
        for (const tab of otherTabs) {
          if (!tab.pinned) {
            await handleTabClose(tab.id);
          }
        }
        break;
        
      case 'close-to-right':
        const currentIndex = tabs.findIndex(tab => tab.id === tabId);
        const tabsToRight = tabs.slice(currentIndex + 1);
        for (const tab of tabsToRight) {
          if (!tab.pinned) {
            await handleTabClose(tab.id);
          }
        }
        break;
        
      case 'close-all':
        for (const tab of tabs) {
          if (!tab.pinned) {
            await handleTabClose(tab.id);
          }
        }
        break;
        
      case 'pin':
        // This would be handled by parent component
        console.log('Pin/unpin tab:', tabId);
        break;
        
      case 'split-horizontal':
        onSplitView?.('horizontal');
        break;
        
      case 'split-vertical':
        onSplitView?.('vertical');
        break;
        
      case 'copy-path':
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.filePath) {
          navigator.clipboard.writeText(tab.filePath);
        }
        break;
        
      case 'reveal-explorer':
        // This would be handled by parent component
        console.log('Reveal in explorer:', tabId);
        break;
    }
  }, [tabs, handleTabClose, onSplitView]);

  // Drag and drop for tab reordering
  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTab(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedTab || !onTabReorder) return;
    
    const dragIndex = tabs.findIndex(tab => tab.id === draggedTab);
    if (dragIndex !== -1 && dragIndex !== dropIndex) {
      onTabReorder(dragIndex, dropIndex);
    }
    
    setDraggedTab(null);
    setDragOverIndex(null);
  }, [draggedTab, tabs, onTabReorder]);

  return (
    <div className={`flex flex-col h-full bg-vscode-bg ${className}`}>
      {/* Enhanced Tab Bar */}
      <div className="flex items-center bg-vscode-tab-bg border-b border-vscode-border min-h-[35px]">
        <div className="flex-1 flex items-center overflow-x-auto ide-scrollbar-horizontal">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
              className={`
                flex items-center px-3 py-1.5 border-r border-vscode-border cursor-pointer
                min-w-[100px] max-w-[180px] relative group
                ${tab.id === activeTabId 
                  ? 'bg-vscode-bg text-vscode-fg border-t-2 border-t-vscode-accent' 
                  : 'bg-vscode-tab-bg text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg'
                }
                ${draggedTab === tab.id ? 'opacity-50' : ''}
                ${dragOverIndex === index ? 'border-l-2 border-l-vscode-accent' : ''}
                ${tab.pinned ? 'border-b-2 border-b-blue-400' : ''}
                transition-colors duration-100
              `}
            >
              {/* Tab Icon */}
              {tab.icon && (
                <span className="mr-2 text-sm flex-shrink-0">{tab.icon}</span>
              )}
              
              {/* Tab Title */}
              <span className="flex-1 truncate text-sm">
                {tab.title}
              </span>
              
              {/* Modified Indicator */}
              {tab.modified && (
                <span className="w-2 h-2 bg-vscode-accent rounded-full ml-2 flex-shrink-0" title="Unsaved changes"></span>
              )}
              
              {/* Pinned Indicator */}
              {tab.pinned && (
                <span className="ml-1 text-xs text-blue-400 flex-shrink-0" title="Pinned">📌</span>
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
                >
                  <span className="text-xs text-vscode-fg-muted hover:text-vscode-fg">×</span>
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Tab Actions */}
        <div className="flex items-center border-l border-vscode-border">
          {/* New Tab Button */}
          {onNewTab && (
            <button
              onClick={onNewTab}
              className="px-3 py-2 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="New Tab"
            >
              <span className="text-sm">+</span>
            </button>
          )}
          
          {/* Split View Button */}
          {onSplitView && (
            <button
              onClick={() => onSplitView('horizontal')}
              className="px-3 py-2 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="Split Editor Right"
            >
              <span className="text-sm">⫘</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <div 
            key={tab.id}
            className={`h-full ${tab.id === activeTabId ? 'block' : 'hidden'}`}
          >
            {tab.content}
          </div>
        ))}
        
        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full text-vscode-fg-muted">
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <p>No tab selected</p>
              <div className="mt-4 text-xs text-vscode-fg-muted">
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
        // Tab exists, just switch to it
        setActiveTabId(tab.id);
        return prev;
      }
      
      // Add new tab - pinned tabs go first, then regular tabs
      if (tab.pinned) {
        // Find the last pinned tab position
        let lastPinnedIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].pinned) {
            lastPinnedIndex = i;
            break;
          }
        }
        const newTabs = [...prev];
        newTabs.splice(lastPinnedIndex + 1, 0, tab);
        return newTabs;
      } else {
        return [...prev, tab];
      }
    });
    setActiveTabId(tab.id);
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // If closing active tab, select next appropriate tab
      if (activeTabId === tabId && newTabs.length > 0) {
        const closingIndex = prev.findIndex(tab => tab.id === tabId);
        
        // Try to select tab to the right first
        let newActiveIndex = Math.min(closingIndex, newTabs.length - 1);
        
        // If no tab to the right, select tab to the left
        if (newActiveIndex >= newTabs.length) {
          newActiveIndex = newTabs.length - 1;
        }
        
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId('');
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  }, []);

  const switchToTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
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
    
    // If all unpinned tabs are closed, switch to first pinned tab or empty
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
  };
}; 