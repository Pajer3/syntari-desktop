// Syntari AI IDE - Tab Layout Component
// Browser-like tab system for project management

import React, { useState, useCallback } from 'react';

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
}

interface TabLayoutProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
  className?: string;
}

// ================================
// TAB LAYOUT COMPONENT
// ================================

export const TabLayout: React.FC<TabLayoutProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
  className = '',
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleTabClick = useCallback((tabId: string) => {
    onTabChange(tabId);
  }, [onTabChange]);

  const handleTabClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose?.(tabId);
  }, [onTabClose]);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTab(null);
  }, []);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700 min-h-[40px]">
        <div className="flex-1 flex items-center overflow-x-auto ide-scrollbar-horizontal">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer
                min-w-[120px] max-w-[200px] relative group
                ${tab.id === activeTabId 
                  ? 'bg-gray-900 text-white border-t-2 border-t-blue-500' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-750 hover:text-white'
                }
                ${draggedTab === tab.id ? 'opacity-50' : ''}
                transition-colors duration-150
              `}
            >
              {/* Tab Icon */}
              {tab.icon && (
                <span className="mr-2 text-sm">{tab.icon}</span>
              )}
              
              {/* Tab Title */}
              <span className="flex-1 truncate text-sm font-medium">
                {tab.title}
              </span>
              
              {/* Modified Indicator */}
              {tab.modified && (
                <span className="w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
              )}
              
              {/* Close Button */}
              {tab.closeable && (
                <button
                  onClick={(e) => handleTabClose(e, tab.id)}
                  className="ml-2 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-xs text-gray-400 hover:text-white">×</span>
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* New Tab Button */}
        {onNewTab && (
          <button
            onClick={onNewTab}
            className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="New Tab"
          >
            <span className="text-sm">+</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <div key={activeTab.id} className="h-full">
            {activeTab.content}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <p>No tab selected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ================================
// TAB MANAGEMENT HOOKS
// ================================

export const useTabManager = (initialTabs: Tab[] = []) => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(
    initialTabs.length > 0 ? initialTabs[0].id : ''
  );

  const addTab = useCallback((tab: Tab) => {
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        const activeIndex = prev.findIndex(tab => tab.id === tabId);
        const newActiveIndex = Math.min(activeIndex, newTabs.length - 1);
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

  return {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    updateTab,
    switchToTab,
  };
}; 