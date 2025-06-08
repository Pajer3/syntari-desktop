import React, { useCallback } from 'react';
import type { FileInfo } from '../../../types';
import type { FileTab, EditorState } from './useEditorState';
import { useRecentlyClosedTabs } from '../../../hooks/useRecentlyClosedTabs';

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
  const { fileTabs, activeTabIndex } = editorState;
  const recentlyClosedTabs = useRecentlyClosedTabs();

  // Tab selection
  const handleTabSelect = useCallback((index: number) => {
    updateEditorState({ activeTabIndex: index });
  }, [updateEditorState]);

  // Tab closing with unsaved changes handling
  const handleTabClose = useCallback((index: number) => {
    const tab = fileTabs[index];
    if (!tab) return;

    // Store in recently closed tabs
    recentlyClosedTabs.addClosedTab({
      filePath: tab.file.path,
      fileName: tab.file.name,
      content: tab.content,
      isModified: tab.isModified,
      isPinned: tab.isPinned,
      tabIndex: index
    });

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

    const options = [
      'Close Tab',
      'Close Other Tabs', 
      'Close Tabs to the Right',
      tab.isPinned ? 'Unpin Tab' : 'Pin Tab',
      'Reveal in Explorer',
      'Copy Path'
    ];
    
    // Simple implementation - in a real app, you'd show a proper context menu
    const choice = prompt(`Context menu for ${tab.file.name}:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nEnter number (1-${options.length}):`);
    const choiceIndex = parseInt(choice || '0') - 1;
    
    switch (choiceIndex) {
      case 0: // Close Tab
        handleTabClose(index);
        break;
      case 1: // Close Other Tabs
        updateEditorState({ 
          fileTabs: [fileTabs[index]], 
          activeTabIndex: 0 
        });
        break;
      case 2: { // Close Tabs to the Right
        const newTabs = fileTabs.slice(0, index + 1);
        const newActiveIndex = activeTabIndex > index ? index : activeTabIndex;
        updateEditorState({ 
          fileTabs: newTabs, 
          activeTabIndex: newActiveIndex 
        });
        break;
      }
      case 3: // Pin/Unpin Tab
        handleTabPin(index);
        break;
      case 4: // Reveal in Explorer
        console.log('Reveal in explorer:', tab.file.path);
        // TODO: Implement reveal in file explorer
        break;
      case 5: // Copy Path
        navigator.clipboard.writeText(tab.file.path);
        console.log('Copied path to clipboard:', tab.file.path);
        break;
      default:
        break;
    }
  }, [fileTabs, activeTabIndex, handleTabClose, handleTabPin, updateEditorState]);

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

  // Open new file in tab
  const openFileInTab = useCallback((file: FileInfo, content: string) => {
    // Check if file is already open
    const existingIndex = fileTabs.findIndex(tab => tab.file.path === file.path);
    
    if (existingIndex !== -1) {
      // File already open, just focus it
      updateEditorState({ activeTabIndex: existingIndex });
      return;
    }

    // Create new tab
    const newTab: FileTab = {
      file,
      content,
      isModified: false,
      isPinned: false,
    };

    const newTabs = [...fileTabs, newTab];
    updateEditorState({ 
      fileTabs: newTabs, 
      activeTabIndex: newTabs.length - 1 
    });

    // Notify parent
    onFileChange?.(file, content);
  }, [fileTabs, updateEditorState, onFileChange]);

  // Create new unsaved file
  const createNewFile = useCallback(() => {
    const tempFileName = `Untitled-${editorState.unsavedFileCounter}`;
    const tempPath = `<unsaved>/${tempFileName}`;
    
    // Check if this temp file is already open
    const existingTempTab = fileTabs.find(tab => tab.file.path === tempPath);
    if (existingTempTab) {
      // Focus the existing unsaved tab
      const index = fileTabs.indexOf(existingTempTab);
      updateEditorState({ activeTabIndex: index });
      return;
    }
    
    // Create new unsaved file tab
    const fileInfo: FileInfo = {
      path: tempPath,
      name: tempFileName,
      extension: '',
      size: 0,
      lastModified: Date.now(),
      content: '',
      language: 'plaintext',
    };

    const newTab: FileTab = {
      file: fileInfo,
      content: '',
      isModified: true, // Mark as modified since it's unsaved
      isPinned: false,
    };

    const newTabs = [...fileTabs, newTab];
    updateEditorState({ 
      fileTabs: newTabs, 
      activeTabIndex: newTabs.length - 1,
      unsavedFileCounter: editorState.unsavedFileCounter + 1
    });

    // Notify parent
    onFileChange?.(fileInfo, '');
  }, [fileTabs, editorState.unsavedFileCounter, updateEditorState, onFileChange]);

  return {
    // Tab operations
    handleTabSelect,
    handleTabClose,
    handleTabMove,
    handleTabPin,
    handleTabContextMenu,
    
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
  };
}; 