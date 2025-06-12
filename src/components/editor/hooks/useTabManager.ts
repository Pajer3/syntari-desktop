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
  const { fileTabs, activeTabIndex } = editorState;
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
        updateEditorState({ 
          fileTabs: [fileTabs[tabIndex]], 
          activeTabIndex: 0 
        });
        break;
      case 'close-to-right': {
        const newTabs = fileTabs.slice(0, tabIndex + 1);
        const newActiveIndex = activeTabIndex > tabIndex ? tabIndex : activeTabIndex;
        updateEditorState({ 
          fileTabs: newTabs, 
          activeTabIndex: newActiveIndex 
        });
        break;
      }
      case 'close-all':
        updateEditorState({ 
          fileTabs: [], 
          activeTabIndex: -1 
        });
        break;
      case 'pin':
        handleTabPin(tabIndex);
        break;
      case 'reveal-explorer':
        console.log('Reveal in explorer:', tab.file.path);
        // TODO: Implement reveal in file explorer
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
  }, [fileTabs, activeTabIndex, handleTabClose, handleTabPin, updateEditorState]);

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

  // Open new file in tab
  const openFileInTab = useCallback((file: FileInfo, content: string) => {
    console.log('🔗 [DEBUG] openFileInTab called with:', { 
      filePath: file.path, 
      fileName: file.name, 
      contentLength: content.length,
      currentTabsCount: fileTabs.length 
    });
    
    // Check if file is already open
    const existingIndex = fileTabs.findIndex(tab => tab.file.path === file.path);
    console.log('🔗 [DEBUG] Existing tab index:', existingIndex);
    
    if (existingIndex !== -1) {
      // File already open, just focus it
      console.log('🔗 [DEBUG] File already open, focusing existing tab');
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
    console.log('🔗 [DEBUG] Creating new tab:', newTab);

    const newTabs = [...fileTabs, newTab];
    const newActiveIndex = newTabs.length - 1;
    console.log('🔗 [DEBUG] New tabs array length:', newTabs.length);
    console.log('🔗 [DEBUG] New active index:', newActiveIndex);
    
    console.log('🔗 [DEBUG] Calling updateEditorState with new tabs...');
    updateEditorState({ 
      fileTabs: newTabs, 
      activeTabIndex: newActiveIndex 
    });
    console.log('🔗 [DEBUG] updateEditorState called successfully');

    // Notify parent
    console.log('🔗 [DEBUG] Notifying parent of file change...');
    onFileChange?.(file, content);
    console.log('🔗 [DEBUG] openFileInTab completed');
  }, [fileTabs, updateEditorState, onFileChange]);

  // Create new unsaved file
  const createNewFile = useCallback(async () => {
    console.log('🆕 [DEBUG] createNewFile called!');
    console.log('🆕 [DEBUG] Current tabs:', fileTabs.length);
    console.log('🆕 [DEBUG] Current active tab index:', activeTabIndex);
    
    // Check if there's already an empty unsaved file that we can reuse
    const existingEmptyUnsaved = fileTabs.find(tab => 
      tab.file.path.startsWith('<unsaved>/') && 
      tab.content.trim() === '' && 
      !tab.isModified
    );
    
    console.log('🆕 [DEBUG] Existing empty unsaved:', !!existingEmptyUnsaved);
    
    if (existingEmptyUnsaved) {
      // Focus the existing empty unsaved tab instead of creating new one
      const index = fileTabs.indexOf(existingEmptyUnsaved);
      console.log('🆕 [DEBUG] Focusing existing empty tab at index:', index);
      updateEditorState({ activeTabIndex: index });
      return;
    }
    
    // Generate a unique filename by checking current directory
    let baseFileName = 'Untitled';
    let fileName = baseFileName;
    let counter = 1;
    
    try {
      // Get current directory files to check for conflicts
      const currentDir = editorState.currentDirectory || '';
      console.log('🆕 [DEBUG] Current directory:', currentDir);
      
      if (currentDir) {
        const existingFiles = await fileSystemService.loadFolderContents(currentDir, false);
        const existingNames = new Set([
          ...existingFiles.map(file => file.name),
          ...fileTabs.map(tab => tab.file.name) // Also check open tabs
        ]);
        
        console.log('🆕 [DEBUG] Existing file names:', Array.from(existingNames));
        
        // Find a unique name
        while (existingNames.has(fileName) || existingNames.has(`${fileName}.txt`)) {
          fileName = `${baseFileName}-${counter}`;
          counter++;
        }
      } else {
        // Fallback to counter-based naming if no current directory
        fileName = `${baseFileName}-${editorState.unsavedFileCounter}`;
      }
    } catch (error) {
      // If filesystem check fails, use fallback naming
      console.log('🆕 [DEBUG] Filesystem check failed, using fallback:', error);
      fileName = `${baseFileName}-${editorState.unsavedFileCounter}`;
    }
    
    console.log('🆕 [DEBUG] Generated filename:', fileName);
    
    const tempPath = `<unsaved>/${fileName}`;
    console.log('🆕 [DEBUG] Generated temp path:', tempPath);
    
    // Double-check this specific temp file isn't already open
    const existingTempTab = fileTabs.find(tab => tab.file.path === tempPath);
    if (existingTempTab) {
      console.log('🆕 [DEBUG] Temp file already open, focusing it');
      const index = fileTabs.indexOf(existingTempTab);
      updateEditorState({ activeTabIndex: index });
      return;
    }
    
    // Create new unsaved file tab
    const fileInfo: FileInfo = {
      path: tempPath,
      name: fileName,
      extension: '',
      size: 0,
      lastModified: Date.now(),
      content: '',
      language: 'plaintext',
    };
    
    console.log('🆕 [DEBUG] Created file info:', fileInfo);

    const newTab: FileTab = {
      file: fileInfo,
      content: '',
      isModified: false, // Start as NOT modified since it's empty
      isPinned: false,
    };
    
    console.log('🆕 [DEBUG] Created new tab:', newTab);

    const newTabs = [...fileTabs, newTab];
    const newActiveIndex = newTabs.length - 1;
    
    console.log('🆕 [DEBUG] New tabs array length:', newTabs.length);
    console.log('🆕 [DEBUG] New active index will be:', newActiveIndex);
    
    console.log('🆕 [DEBUG] Calling updateEditorState...');
    updateEditorState({ 
      fileTabs: newTabs, 
      activeTabIndex: newActiveIndex,
      unsavedFileCounter: editorState.unsavedFileCounter + 1
    });
    console.log('🆕 [DEBUG] updateEditorState called');

    // Notify parent
    console.log('🆕 [DEBUG] Notifying parent onFileChange...');
    onFileChange?.(fileInfo, '');
    console.log('🆕 [DEBUG] createNewFile completed successfully!');
  }, [fileTabs, activeTabIndex, editorState.currentDirectory, editorState.unsavedFileCounter, updateEditorState, onFileChange]);

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
  };
}; 