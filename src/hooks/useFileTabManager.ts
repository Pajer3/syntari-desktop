// Syntari AI IDE - File Tab Management Hook
// Handles automatic tab closure when files are deleted

import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';

export interface FileTab {
  path: string;
  name: string;
  isDirty?: boolean;
  isActive?: boolean;
}

export interface UseFileTabManagerProps {
  tabs: FileTab[];
  onCloseTab: (path: string) => void;
  onCloseMultipleTabs: (paths: string[]) => void;
}

export const useFileTabManager = ({
  tabs,
  onCloseTab,
  onCloseMultipleTabs
}: UseFileTabManagerProps) => {
  
  // Handle file deletion events
  const handleFileDeleted = useCallback((deletedPath: string, isDirectory: boolean) => {
    console.log('🗂️ Tab manager handling deletion:', { deletedPath, isDirectory });
    
    if (isDirectory) {
      // Close all tabs for files within the deleted directory
      const tabsToClose = tabs
        .filter(tab => tab.path.startsWith(deletedPath + '/') || tab.path === deletedPath)
        .map(tab => tab.path);
      
      if (tabsToClose.length > 0) {
        console.log(`🗑️ Closing ${tabsToClose.length} tabs for deleted directory:`, tabsToClose);
        onCloseMultipleTabs(tabsToClose);
      }
    } else {
      // Close specific file tab
      const tabToClose = tabs.find(tab => tab.path === deletedPath);
      if (tabToClose) {
        console.log('🗑️ Closing tab for deleted file:', deletedPath);
        onCloseTab(deletedPath);
      }
    }
  }, [tabs, onCloseTab, onCloseMultipleTabs]);

  // Listen for file deletion events
  useEffect(() => {
    let unsubscribeFileDeleted: (() => void) | undefined;
    let unsubscribeFileSystemChange: (() => void) | undefined;

    const setupListener = async () => {
      try {
        // Listen for immediate file deletion events (higher priority)
        unsubscribeFileDeleted = await listen('file-deleted', (event: any) => {
          const deletionInfo = event.payload;
          console.log('🗑️ Immediate file deletion detected:', deletionInfo);
          handleFileDeleted(deletionInfo.path, deletionInfo.is_directory);
        });

        // Also listen for general file system changes as backup
        unsubscribeFileSystemChange = await listen('file-system-change', (event: any) => {
          const changeInfo = event.payload;
          if (changeInfo.event_type === 'deleted') {
            console.log('🗑️ File deletion via file-system-change:', changeInfo);
            handleFileDeleted(changeInfo.path, changeInfo.is_directory);
          }
        });
        
        console.log('✅ File tab manager event listeners setup successfully');
      } catch (error) {
        console.error('❌ Failed to setup file tab manager event listeners:', error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribeFileDeleted) {
        unsubscribeFileDeleted();
      }
      if (unsubscribeFileSystemChange) {
        unsubscribeFileSystemChange();
      }
    };
  }, [handleFileDeleted]);

  // Utility function to check if a file path exists in tabs
  const hasTabForFile = useCallback((filePath: string): boolean => {
    return tabs.some(tab => tab.path === filePath);
  }, [tabs]);

  // Utility function to get tab by path
  const getTabByPath = useCallback((filePath: string): FileTab | undefined => {
    return tabs.find(tab => tab.path === filePath);
  }, [tabs]);

  // Utility function to close all tabs for a directory
  const closeTabsForDirectory = useCallback((directoryPath: string) => {
    const tabsToClose = tabs
      .filter(tab => tab.path.startsWith(directoryPath + '/'))
      .map(tab => tab.path);
    
    if (tabsToClose.length > 0) {
      onCloseMultipleTabs(tabsToClose);
    }
  }, [tabs, onCloseMultipleTabs]);

  return {
    hasTabForFile,
    getTabByPath,
    closeTabsForDirectory,
    handleFileDeleted
  };
}; 