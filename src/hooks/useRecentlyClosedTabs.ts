// Syntari AI IDE - Recently Closed Tabs Management Hook
// Manages history of closed tabs for reopening functionality

import { useState, useCallback, useRef } from 'react';

export interface ClosedTabInfo {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  isModified: boolean;
  isPinned: boolean;
  closedAt: number;
  tabIndex: number; // Original position in tab bar
}

export interface RecentlyClosedTabsManager {
  recentlyClosedTabs: ClosedTabInfo[];
  addClosedTab: (tabInfo: Omit<ClosedTabInfo, 'id' | 'closedAt'>) => void;
  reopenMostRecentTab: () => ClosedTabInfo | null;
  reopenTabById: (id: string) => ClosedTabInfo | null;
  clearHistory: () => void;
  getTabHistory: () => ClosedTabInfo[];
  removeFromHistory: (id: string) => void;
}

export const useRecentlyClosedTabs = (maxHistory: number = 20): RecentlyClosedTabsManager => {
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<ClosedTabInfo[]>([]);
  const idCounter = useRef(0);

  const generateId = useCallback(() => {
    return `closed_tab_${++idCounter.current}_${Date.now()}`;
  }, []);

  const addClosedTab = useCallback((tabInfo: Omit<ClosedTabInfo, 'id' | 'closedAt'>) => {
    const closedTab: ClosedTabInfo = {
      ...tabInfo,
      id: generateId(),
      closedAt: Date.now()
    };

    setRecentlyClosedTabs(prev => {
      // Add to beginning of array (most recent first)
      const newHistory = [closedTab, ...prev];
      
      // Maintain history limit
      return newHistory.slice(0, maxHistory);
    });
  }, [generateId, maxHistory]);

  const reopenMostRecentTab = useCallback((): ClosedTabInfo | null => {
    let tabToReopen: ClosedTabInfo | null = null;

    setRecentlyClosedTabs(prev => {
      if (prev.length === 0) {
        return prev;
      }

      // Get the most recent tab
      tabToReopen = prev[0];
      
      // Remove it from history
      return prev.slice(1);
    });

    return tabToReopen;
  }, []);

  const reopenTabById = useCallback((id: string): ClosedTabInfo | null => {
    let tabToReopen: ClosedTabInfo | null = null;

    setRecentlyClosedTabs(prev => {
      const tabIndex = prev.findIndex(tab => tab.id === id);
      if (tabIndex === -1) {
        return prev;
      }

      tabToReopen = prev[tabIndex];
      
      // Remove the tab from history
      return prev.filter((_, index) => index !== tabIndex);
    });

    return tabToReopen;
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setRecentlyClosedTabs(prev => prev.filter(tab => tab.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setRecentlyClosedTabs([]);
  }, []);

  const getTabHistory = useCallback(() => {
    return [...recentlyClosedTabs]; // Return copy to prevent mutation
  }, [recentlyClosedTabs]);

  return {
    recentlyClosedTabs,
    addClosedTab,
    reopenMostRecentTab,
    reopenTabById,
    clearHistory,
    getTabHistory,
    removeFromHistory
  };
}; 