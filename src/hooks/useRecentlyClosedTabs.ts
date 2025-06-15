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

    console.log('📚 DEBUG: Adding closed tab to stack:', closedTab.fileName);

    setRecentlyClosedTabs(prev => {
      // Add to beginning of array (most recent first)
      const newHistory = [closedTab, ...prev];
      
      // Maintain history limit
      const trimmedHistory = newHistory.slice(0, maxHistory);
      console.log('📚 DEBUG: Closed tabs stack size:', trimmedHistory.length, 'items:', trimmedHistory.map(t => t.fileName));
      
      return trimmedHistory;
    });
  }, [generateId, maxHistory]);

  const reopenMostRecentTab = useCallback((): ClosedTabInfo | null => {
    let tabToReopen: ClosedTabInfo | null = null;

    console.log('📚 DEBUG: Attempting to reopen most recent tab');

    setRecentlyClosedTabs(prev => {
      console.log('📚 DEBUG: Current closed tabs stack:', prev.length, 'items:', prev.map(t => t.fileName));
      
      if (prev.length === 0) {
        console.log('📚 DEBUG: No tabs to reopen - stack is empty');
        return prev;
      }

      // Get the most recent tab
      tabToReopen = prev[0];
      console.log('📚 DEBUG: Reopening tab:', tabToReopen.fileName);
      
      // Remove it from history
      const newStack = prev.slice(1);
      console.log('📚 DEBUG: Remaining stack size:', newStack.length);
      return newStack;
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