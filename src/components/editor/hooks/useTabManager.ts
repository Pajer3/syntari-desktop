import React, { useCallback, useState } from 'react';
import type { FileInfo } from '../../../types';
import type { FileTab, EditorState } from './useEditorState';
import { useRecentlyClosedTabs } from '../../../hooks/useRecentlyClosedTabs';
import { fileSystemService } from '../../../services/fileSystemService';

interface UseTabManagerProps {
  editorState: EditorState;
  updateEditorState: (updates: Partial<EditorState>) => void;
  onFileChange?: (file: FileInfo, content: string) => void;
}

export const useTabManager = ({ 
  editorState, 
  updateEditorState, 
  onFileChange 
}: UseTabManagerProps) => {
  const { fileTabs, activeTabIndex, currentDirectory, projectRootPath } = editorState;
  const recentlyClosedTabs = useRecentlyClosedTabs();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabIndex: number;
  }>({ visible: false, x: 0, y: 0, tabIndex: -1 });

  // Tab selection
  const handleTabSelect = useCallback((index: number) => {
    updateEditorState({ activeTabIndex: index });
  }, [updateEditorState]);

  // Tab closing with unsaved changes handling
  const handleTabClose = useCallback((index: number) => {
    const tab = fileTabs[index];
    if (!tab) return;

    console.log('🔄 DEBUG: Closing tab and adding to recently closed:', tab.file.name);
    
    // Store in recently closed tabs
    recentlyClosedTabs.addClosedTab({
      filePath: tab.file.path,
      fileName: tab.file.name,
      content: tab.content,
      isModified: tab.isModified,
      isPinned: tab.isPinned,
      tabIndex: index
    });

    console.log('🔄 DEBUG: Tab added to recently closed tabs:', tab.file.name);

    // Remove from tabs
    const newTabs = fileTabs.filter((_, i) => i !== index);
    
    // Adjust active tab index
    let newActiveIndex = activeTabIndex;
    if (index === activeTabIndex) {
      if (newTabs.length === 0) {
        newActiveIndex = -1;
      } else if (index === fileTabs.length - 1) {
        newActiveIndex = index - 1;
      } else {
        newActiveIndex = index;
      }
    } else if (index < activeTabIndex) {
      newActiveIndex = activeTabIndex - 1;
    }

    updateEditorState({ 
      fileTabs: newTabs, 
      activeTabIndex: newActiveIndex 
    });
  }, [fileTabs, activeTabIndex, recentlyClosedTabs, updateEditorState]);

  // Tab move (for drag and drop reordering)
  const handleTabMove = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newTabs = [...fileTabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    
    // Update active tab index if needed
    let newActiveIndex = activeTabIndex;
    if (activeTabIndex === fromIndex) {
      newActiveIndex = toIndex;
    } else if (activeTabIndex > fromIndex && activeTabIndex <= toIndex) {
      newActiveIndex = activeTabIndex - 1;
    } else if (activeTabIndex < fromIndex && activeTabIndex >= toIndex) {
      newActiveIndex = activeTabIndex + 1;
    }

    updateEditorState({ 
      fileTabs: newTabs, 
      activeTabIndex: newActiveIndex 
    });
  }, [fileTabs, activeTabIndex, updateEditorState]);

  // Tab pinning/unpinning
  const handleTabPin = useCallback((index: number) => {
    const newTabs = fileTabs.map((tab, i) => 
      i === index ? { ...tab, isPinned: !tab.isPinned } : tab
    );
    updateEditorState({ fileTabs: newTabs });
  }, [fileTabs, updateEditorState]);

  // Tab context menu actions
  const handleTabContextMenu = useCallback((index: number, event: React.MouseEvent) => {
    event.preventDefault();
    const tab = fileTabs[index];
    if (!tab) return;

    // Set context menu state instead of showing prompt
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      tabIndex: index,
    });
  }, [fileTabs]);

  // Context menu action handler
  const handleContextMenuAction = useCallback((action: string, tabIndex: number) => {
    const tab = fileTabs[tabIndex];
    if (!tab) return;

    switch (action) {
      case 'close':
        handleTabClose(tabIndex);
        break;
      case 'close-others':
        // Track all tabs that will be closed
        fileTabs.forEach((tab, index) => {
          if (index !== tabIndex) {
            recentlyClosedTabs.addClosedTab({
              filePath: tab.file.path,
              fileName: tab.file.name,
              content: tab.content,
              isModified: tab.isModified,
              isPinned: tab.isPinned,
              tabIndex: index
            });
          }
        });
        updateEditorState({ 
          fileTabs: [fileTabs[tabIndex]], 
          activeTabIndex: 0 
        });
        break;
      case 'close-to-right': {
        // Track tabs that will be closed
        fileTabs.slice(tabIndex + 1).forEach((tab, index) => {
          recentlyClosedTabs.addClosedTab({
            filePath: tab.file.path,
            fileName: tab.file.name,
            content: tab.content,
            isModified: tab.isModified,
            isPinned: tab.isPinned,
            tabIndex: tabIndex + 1 + index
          });
        });
        const newTabs = fileTabs.slice(0, tabIndex + 1);
        const newActiveIndex = activeTabIndex > tabIndex ? tabIndex : activeTabIndex;
        updateEditorState({ 
          fileTabs: newTabs, 
          activeTabIndex: newActiveIndex 
        });
        break;
      }
      case 'close-all':
        // Track all tabs that will be closed
        fileTabs.forEach((tab, index) => {
          recentlyClosedTabs.addClosedTab({
            filePath: tab.file.path,
            fileName: tab.file.name,
            content: tab.content,
            isModified: tab.isModified,
            isPinned: tab.isPinned,
            tabIndex: index
          });
        });
        updateEditorState({ 
          fileTabs: [], 
          activeTabIndex: -1 
        });
        break;
      case 'pin':
        handleTabPin(tabIndex);
        break;
      case 'reveal-explorer':
        // Reveal file in the file explorer panel
        const event = new CustomEvent('syntari:revealFile', { 
          detail: { filePath: tab.file.path } 
        });
        window.dispatchEvent(event);
        break;
      case 'copy-path':
        navigator.clipboard.writeText(tab.file.path);
        console.log('Copied path to clipboard:', tab.file.path);
        break;
      default:
        break;
    }
    
    // Close context menu
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [fileTabs, activeTabIndex, handleTabClose, handleTabPin, updateEditorState, recentlyClosedTabs]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    updateEditorState({ draggedTabIndex: index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, [updateEditorState]);

  const handleDragEnd = useCallback(() => {
    updateEditorState({ 
      draggedTabIndex: null, 
      dragOverIndex: null 
    });
  }, [updateEditorState]);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    updateEditorState({ dragOverIndex: index });
  }, [updateEditorState]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    updateEditorState({ dragOverIndex: index });
  }, [updateEditorState]);

  const handleDragLeave = useCallback(() => {
    updateEditorState({ dragOverIndex: null });
  }, [updateEditorState]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const { draggedTabIndex } = editorState;
    if (draggedTabIndex === null || draggedTabIndex === dropIndex) {
      updateEditorState({ 
        draggedTabIndex: null, 
        dragOverIndex: null 
      });
      return;
    }
    
    handleTabMove(draggedTabIndex, dropIndex);
    updateEditorState({ 
      draggedTabIndex: null, 
      dragOverIndex: null 
    });
  }, [editorState.draggedTabIndex, handleTabMove, updateEditorState]);

  // Open file in tab with enhanced logic
  const openFileInTab = useCallback((fileInfo: FileInfo, content: string) => {
    // Check if file is already open
    const existingIndex = fileTabs.findIndex(tab => tab.file.path === fileInfo.path);
    
    if (existingIndex !== -1) {
      // File already open, just focus it
      updateEditorState({ 
        activeTabIndex: existingIndex,
        currentDirectory: fileInfo.path.substring(0, fileInfo.path.lastIndexOf('/'))
      });
      return;
    }

    // Create new tab
    const newTab: FileTab = {
      file: fileInfo,
      content,
      isModified: false,
      isPinned: false,
    };

    const newTabs = [...fileTabs, newTab];
    const newActiveIndex = newTabs.length - 1;
    
    updateEditorState({ 
      fileTabs: newTabs,
      activeTabIndex: newActiveIndex,
      currentDirectory: fileInfo.path.substring(0, fileInfo.path.lastIndexOf('/'))
    });

    // Notify parent of file change
    onFileChange?.(fileInfo, content);
  }, [fileTabs, updateEditorState, onFileChange]);

  // Reopen recently closed tab
  const reopenRecentlyClosedTab = useCallback(() => {
    const lastClosedTab = recentlyClosedTabs.reopenMostRecentTab();
    if (lastClosedTab) {
      console.log('🔄 Reopening recently closed tab:', lastClosedTab.filePath, lastClosedTab.fileName);
      
      // Check if file is already open
      const existingIndex = fileTabs.findIndex(tab => tab.file.path === lastClosedTab.filePath);
      
      if (existingIndex !== -1) {
        // File already open, just focus it
        updateEditorState({ activeTabIndex: existingIndex });
        console.log('✅ File already open, focusing existing tab');
        return;
      }
      
      // Create FileInfo from the closed tab data
      const fileInfo: FileInfo = {
        path: lastClosedTab.filePath,
        name: lastClosedTab.fileName,
        extension: lastClosedTab.fileName.split('.').pop() || '',
        size: lastClosedTab.content.length,
        lastModified: Date.now(),
        content: lastClosedTab.content,
      };
      
      // Create new tab with restored content
      const newTab: FileTab = {
        file: fileInfo,
        content: lastClosedTab.content,
        isModified: lastClosedTab.isModified,
        isPinned: lastClosedTab.isPinned,
      };
      
      // Add to tabs at the original position if possible, otherwise at the end
      const newTabs = [...fileTabs];
      const insertIndex = Math.min(lastClosedTab.tabIndex, newTabs.length);
      newTabs.splice(insertIndex, 0, newTab);
      
      updateEditorState({ 
        fileTabs: newTabs,
        activeTabIndex: insertIndex,
        currentDirectory: lastClosedTab.filePath.substring(0, lastClosedTab.filePath.lastIndexOf('/'))
      });

      // Notify parent of file change
      onFileChange?.(fileInfo, lastClosedTab.content);
      
      console.log('✅ Successfully reopened tab:', lastClosedTab.fileName);
    } else {
      console.log('📝 No recently closed tabs to reopen');
    }
  }, [recentlyClosedTabs, fileTabs, updateEditorState, onFileChange]);

  // Create new file with intelligent naming
  const createNewFile = useCallback(() => {
    // Check if there's already an empty unsaved tab
    const existingEmptyUnsaved = fileTabs.find((tab, index) => 
      tab.file.path.startsWith('<unsaved>/') && 
      tab.content.trim() === '' && 
      !tab.isModified
    );

    if (existingEmptyUnsaved) {
      // Focus the existing empty tab instead of creating a new one
      const index = fileTabs.indexOf(existingEmptyUnsaved);
      updateEditorState({ activeTabIndex: index });
      return;
    }

    // Generate unique filename
    let fileName = 'untitled.txt';
    let counter = 1;
    
    // Get existing file names to avoid conflicts
    let existingNames: Set<string>;
    try {
      // Try to get existing files from the current directory
      existingNames = new Set(fileTabs.map(tab => tab.file.name));
    } catch (error) {
      // If we can't get directory contents, just use tab names
      existingNames = new Set(fileTabs.map(tab => tab.file.name));
    }

    // Find unique filename
    while (existingNames.has(fileName)) {
      fileName = `untitled${counter}.txt`;
      counter++;
    }

    // Create temporary path
    const tempPath = `<unsaved>/${fileName}`;

    // Check if this temp file is already open
    if (fileTabs.some(tab => tab.file.path === tempPath)) {
      const existingIndex = fileTabs.findIndex(tab => tab.file.path === tempPath);
      updateEditorState({ activeTabIndex: existingIndex });
      return;
    }

    // Create file info
    const fileInfo: FileInfo = {
      path: tempPath,
      name: fileName,
      extension: 'txt',
      size: 0,
      lastModified: Date.now(),
      content: '',
    };

    // Create new tab
    const newTab: FileTab = {
      file: fileInfo,
      content: '',
      isModified: false,
      isPinned: false,
    };

    // Add to tabs
    const newTabs = [...fileTabs, newTab];
    const newActiveIndex = newTabs.length - 1;
    
    updateEditorState({ 
      fileTabs: newTabs,
      activeTabIndex: newActiveIndex
    });

    // Notify parent
    onFileChange?.(fileInfo, '');
  }, [fileTabs, activeTabIndex, currentDirectory, projectRootPath, updateEditorState, onFileChange]);

  return {
    // Tab operations
    handleTabSelect,
    handleTabClose,
    handleTabMove,
    handleTabPin,
    handleTabContextMenu,
    
    // Context menu
    contextMenu,
    handleContextMenuAction,
    closeContextMenu,
    
    // Drag and drop
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // File operations
    openFileInTab,
    createNewFile,
    reopenRecentlyClosedTab,
  };
}; 