// Syntari AI IDE - Enhanced Code Editor with Multi-Tab Support
// Professional editor with VS Code-style tab management

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { ProjectContext, FileInfo } from '../types';
import type { FileNode } from '../types/fileSystem';
import { useFileCache, type EditorFile } from './editor/useFileCache';
import { useFileLoader } from './editor/useFileLoader';
import { useFileSave } from './editor/useFileSave';
import { usePerformanceConfig } from './editor/usePerformanceConfig';
import { useShortcut } from '../hooks/useKeyboardShortcuts';
import { VirtualizedFileExplorer } from './editor/VirtualizedFileExplorer';
import { EmptyEditorState } from './editor/EmptyEditorState';
import { PerformanceModeIndicator } from './editor/PerformanceModeIndicator';
import { PerformanceMetrics } from './editor/PerformanceMetrics';
import { ErrorNotification } from './editor/ErrorNotification';
import { MonacoEditorWrapper } from './editor/MonacoEditorWrapper';
import { SearchPanel } from './editor/search/SearchPanel';
import { UnsavedChangesDialog } from './editor/UnsavedChangesDialog';
import { GoToLineDialog } from './editor/GoToLineDialog';
import { QuickOpen } from './QuickOpen';
import { getFileIcon } from '../utils/editorUtils';
import { SaveAsDialog } from './editor/dialogs/SaveAsDialog';
import { OpenFileDialog } from './editor/dialogs/OpenFileDialog';
import { FileManagementService } from '../services/fileManagementService';
import { fileSystemService } from '../services/fileSystemService';


// ================================
// TYPES
// ================================

interface CodeEditorProps {
  project: ProjectContext;
  onFileChange?: (file: FileInfo, content: string) => void;
  onRequestAI?: (context: any) => void;
}

interface FileTab {
  file: FileInfo;
  content: string;
  isModified: boolean;
  isPinned: boolean;
}

// ================================
// ENHANCED CODE EDITOR
// ================================

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
}) => {
  // Ensure project has required properties with defaults
  const safeProject: ProjectContext = {
    rootPath: project?.rootPath || '',
    projectType: project?.projectType || 'unknown',
    openFiles: project?.openFiles || [],
    dependencies: project?.dependencies || [],
    gitBranch: project?.gitBranch,
    activeFramework: project?.activeFramework,
    lastAnalyzed: project?.lastAnalyzed || Date.now(),
  };

  // Core state
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentDirectory, setCurrentDirectory] = useState<string>(safeProject.rootPath || '');
  const [fileExplorerKey, setFileExplorerKey] = useState<number>(0); // For forcing refresh
  
  // Custom hooks for focused functionality
  const fileCache = useFileCache();
  const fileLoader = useFileLoader();
  const fileSaver = useFileSave();
  const performanceConfig = usePerformanceConfig();
  
  // Refs for optimization
  const contentChangeTimeoutRef = useRef<number>();
  const goToLineRef = useRef<((lineNumber: number, column?: number) => void) | null>(null);
  const getCurrentLineRef = useRef<(() => number) | null>(null);
  const getTotalLinesRef = useRef<(() => number) | null>(null);
  const openFindRef = useRef<(() => void) | null>(null);
  const openFindReplaceRef = useRef<(() => void) | null>(null);
  const goToSymbolRef = useRef<(() => void) | null>(null);
  
  // Unsaved changes dialog
  const [unsavedDialog, setUnsavedDialog] = useState<{
    isOpen: boolean;
    tabIndex: number;
    fileName: string;
  }>({ isOpen: false, tabIndex: -1, fileName: '' });

  // File Management Dialog States
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const [isOpenFileDialogOpen, setIsOpenFileDialogOpen] = useState(false);
  const [recentFilePaths, setRecentFilePaths] = useState<string[]>([]);
  
  // File Management Service
  const fileService = useMemo(() => FileManagementService.getInstance(), []);

  // Unsaved files counter for unique naming
  const [unsavedFileCounter, setUnsavedFileCounter] = useState(1);

  // Get active tab
  const activeTab = activeTabIndex >= 0 ? fileTabs[activeTabIndex] : null;

  // Get recently opened files for QuickOpen prioritization
  const recentlyOpenedFiles = fileTabs.map(tab => tab.file.path);

  // Convert FileNode to FileInfo for compatibility
  const convertFileNode = useCallback((node: FileNode): FileInfo => ({
    path: node.path,
    name: node.name,
    extension: node.extension || '',
    size: node.size || 0,
    lastModified: node.lastModified ? new Date(node.lastModified).getTime() : Date.now(),
    content: undefined,
    language: node.isDirectory ? 'directory' : undefined,
  }), []);

  // File selection handler - now tracks current directory
  const handleFileSelect = useCallback(async (node: FileNode) => {
    // Update current directory to the parent folder of the selected file
    if (!node.isDirectory) {
      const parentDir = node.path.substring(0, node.path.lastIndexOf('/')) || safeProject.rootPath;
      setCurrentDirectory(parentDir);
    } else {
      // If selecting a directory, update current directory to that directory
      setCurrentDirectory(node.path);
    }

    if (node.isDirectory) return;
    
    const fileInfo = convertFileNode(node);
    
    // Check if file is already open
    const existingTabIndex = fileTabs.findIndex(tab => tab.file.path === fileInfo.path);
    if (existingTabIndex !== -1) {
      setActiveTabIndex(existingTabIndex);
      return;
    }
    
    // Load new file
    const loadedFile = await fileLoader.loadFileContent(
      fileInfo,
      fileCache.getCachedContent,
      fileCache.setCachedContent
    );
    
    if (loadedFile) {
      const newTab: FileTab = {
        file: fileInfo,
        content: loadedFile.content,
        isModified: false,
        isPinned: false,
      };
      
      setFileTabs(prev => [...prev, newTab]);
      setActiveTabIndex(fileTabs.length); // Will be the new tab's index
      
      // Notify parent of file change
      onFileChange?.(fileInfo, loadedFile.content);
      
      // Notify QuickOpen session priority system (for priority tracking)
      if ((window as any).quickOpenSessionPriority) {
        (window as any).quickOpenSessionPriority.markFileOpened(fileInfo.path);
      }
    }
  }, [fileTabs, convertFileNode, fileLoader, fileCache, onFileChange]);

  // Handle tab selection
  const handleTabClick = useCallback((index: number) => {
    setActiveTabIndex(index);
    const tab = fileTabs[index];
    if (tab) {
      onFileChange?.(tab.file, tab.content);
    }
  }, [fileTabs, onFileChange]);

  // Update active tab content when index changes (for keyboard navigation)
  useEffect(() => {
    if (activeTabIndex >= 0 && activeTabIndex < fileTabs.length) {
      const tab = fileTabs[activeTabIndex];
      if (tab) {
        onFileChange?.(tab.file, tab.content);
      }
    }
  }, [activeTabIndex, fileTabs, onFileChange]);

  // Handle content changes
  const handleContentChange = useCallback((content: string) => {
    if (activeTabIndex < 0) return;
    
    setFileTabs(prev => prev.map((tab, index) => 
      index === activeTabIndex 
        ? { ...tab, content, isModified: content !== fileCache.getCachedContent(tab.file.path) }
        : tab
    ));
    
    const activeTab = fileTabs[activeTabIndex];
    if (activeTab) {
      // Update file cache immediately for responsiveness
      fileCache.setCachedContent(activeTab.file.path, content);
      onFileChange?.(activeTab.file, content);
    }
  }, [activeTabIndex, fileTabs, fileCache, onFileChange]);

  // Handle Save As - needs to be declared before handleSave
  const handleSaveAs = useCallback(() => {
    if (!activeTab) {
      console.warn('No active tab to save');
      return;
    }
    setIsSaveAsDialogOpen(true);
  }, [activeTab]);

  // Enhanced save function with conflict detection and proper file creation
  const handleSave = useCallback(async (tabIndex?: number) => {
    const targetIndex = tabIndex ?? activeTabIndex;
    if (targetIndex < 0) return;

    const tab = fileTabs[targetIndex];
    if (!tab) return;

    try {
      // Check if this is an unsaved file (temporary path)
      if (tab.file.path.startsWith('<unsaved>/')) {
        // This is an unsaved file, need to save as new file
        handleSaveAs();
        return;
      }

      // Check if file exists and we're not the owner
      const existingTabWithSamePath = fileTabs.find((t, i) => 
        i !== targetIndex && t.file.path === tab.file.path
      );
      
      if (existingTabWithSamePath) {
        throw new Error(`Cannot save: Another tab is already editing "${tab.file.path}"`);
      }

      // Regular save for existing files
      const editorFile: EditorFile = {
        ...tab.file,
        content: tab.content,
        isOpen: true,
        isDirty: tab.isModified,
      };
      
      const success = await fileSaver.saveFile(
        editorFile.path,
        tab.content,
        { silent: false }
      );
      
      if (success.success) {
        setFileTabs(prev => prev.map((t, index) => 
          index === targetIndex ? { ...t, isModified: false } : t
        ));
        fileCache.setCachedContent(editorFile.path, tab.content);
        
        // Manually trigger file system cache invalidation for immediate updates
        const parentDir = tab.file.path.substring(0, tab.file.path.lastIndexOf('/'));
        fileSystemService.invalidateCache(parentDir);
        
        // Manually trigger file system event to update file explorer immediately
        fileSystemService.handleFileSystemEvent('modified', tab.file.path, false);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      setCurrentError(error as Error);
    }
  }, [activeTabIndex, fileTabs, fileSaver, fileCache, handleSaveAs]);

  // Handle AI requests
  const handleAskAI = useCallback(() => {
    if (!activeTab) return;

    onRequestAI?.({
      type: 'file-analysis',
      file: activeTab.file,
      content: activeTab.content,
      context: `Analyze this ${activeTab.file.extension} file`
    });
  }, [activeTab, onRequestAI]);

  // Handle Go to Line
  const handleGoToLine = useCallback((lineNumber: number, column?: number) => {
    if (goToLineRef.current) {
      goToLineRef.current(lineNumber, column);
    } else {
      console.warn('Monaco editor not ready for navigation');
    }
  }, []);

  const handleShowGoToLine = useCallback(() => {
    if (activeTab) {
      setShowGoToLine(true);
    }
  }, [activeTab]);

  // Handle Find in File
  const handleOpenFind = useCallback(() => {
    if (openFindRef.current) {
      openFindRef.current();
    }
  }, []);

  // Handle Find and Replace in File
  const handleOpenFindReplace = useCallback(() => {
    if (openFindReplaceRef.current) {
      openFindReplaceRef.current();
    }
  }, []);

  // Handle Go to Symbol in File
  const handleGoToSymbol = useCallback(() => {
    if (goToSymbolRef.current) {
      goToSymbolRef.current();
    }
  }, []);

  // Handle Toggle Sidebar
  const handleToggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  // Handle tab closing with unsaved changes check
  const handleTabClose = useCallback(async (index: number) => {
    const tab = fileTabs[index];
    if (!tab) return;

    // Check for unsaved changes
    if (tab.isModified) {
      setUnsavedDialog({
        isOpen: true,
        tabIndex: index,
        fileName: tab.file.name,
      });
      return;
    }

    // Close tab
    setFileTabs(prev => prev.filter((_, i) => i !== index));
    
    // Adjust active tab index
    if (index === activeTabIndex) {
      if (fileTabs.length === 1) {
        setActiveTabIndex(-1);
      } else if (index === fileTabs.length - 1) {
        setActiveTabIndex(index - 1);
      } else {
        setActiveTabIndex(index);
      }
    } else if (index < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  }, [fileTabs, activeTabIndex]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedTabIndex === null || draggedTabIndex === dropIndex) {
      setDraggedTabIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    setFileTabs(prev => {
      const newTabs = [...prev];
      const [draggedTab] = newTabs.splice(draggedTabIndex, 1);
      newTabs.splice(dropIndex, 0, draggedTab);
      return newTabs;
    });
    
    // Update active tab index
    if (activeTabIndex === draggedTabIndex) {
      setActiveTabIndex(dropIndex);
    } else if (activeTabIndex > draggedTabIndex && activeTabIndex <= dropIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    } else if (activeTabIndex < draggedTabIndex && activeTabIndex >= dropIndex) {
      setActiveTabIndex(activeTabIndex + 1);
    }
    
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  }, [draggedTabIndex, activeTabIndex]);

  // File Management Handlers
  const handleNewFile = useCallback(() => {
    // Create an unsaved file in memory with unique temporary name
    const tempFileName = `Untitled-${unsavedFileCounter}`;
    const tempPath = `<unsaved>/${tempFileName}`;
    
    // Check if this temp file is already open
    const existingTempTab = fileTabs.find(tab => tab.file.path === tempPath);
    if (existingTempTab) {
      // Focus the existing unsaved tab
      const index = fileTabs.indexOf(existingTempTab);
      setActiveTabIndex(index);
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

    setFileTabs(prev => [...prev, newTab]);
    setActiveTabIndex(fileTabs.length);
    setUnsavedFileCounter(prev => prev + 1);

    // Notify parent
    onFileChange?.(fileInfo, '');
  }, [fileTabs, unsavedFileCounter, onFileChange]);

  const handleCreateFile = useCallback(async (fileName: string, content?: string) => {
    // This is only called from the NewFileDialog, which we'll remove
    // Instead, we'll handle file creation through the save process
    console.warn('handleCreateFile should not be called directly anymore');
  }, []);

  const handleSaveAsFile = useCallback(async (filePath: string, fileName: string) => {
    try {
      if (!activeTab) {
        throw new Error('No active tab to save');
      }

      const fullPath = `${filePath}/${fileName}`;
      
      // Check if a file with this exact path already exists in another tab
      const existingTab = fileTabs.find((tab, index) => 
        index !== activeTabIndex && tab.file.path === fullPath
      );
      
      if (existingTab) {
        throw new Error(`Cannot save: File "${fullPath}" is already open in another tab`);
      }

      // Check if file exists on disk using proper file existence check
      const fileExists = await fileService.fileExists(fullPath);
      if (fileExists) {
        const confirmed = confirm(`File "${fileName}" already exists. Do you want to overwrite it?`);
        if (!confirmed) {
          return;
        }
      }

      const result = await fileService.saveFileAs({
        currentFilePath: activeTab.file.path,
        newFilePath: filePath,
        newFileName: fileName,
        content: activeTab.content
      });

      // Convert FileOpenResult to FileInfo
      const fileInfo: FileInfo = {
        path: result.path,
        name: result.name,
        extension: result.name.split('.').pop() || '',
        size: result.size,
        lastModified: result.lastModified.getTime(),
        content: result.content,
        language: getLanguageFromFileName(result.name),
      };

      // Update the tab with new file info (converting from unsaved to saved)
      setFileTabs(prev => prev.map((tab, index) => 
        index === activeTabIndex 
          ? { ...tab, file: fileInfo, isModified: false }
          : tab
      ));

      // Add to recent files
      await fileService.addToRecentFiles(result.path);
      setRecentFilePaths(prev => [result.path, ...prev.slice(0, 9)]);

      // Force file explorer refresh to show the saved file
      setFileExplorerKey(prev => prev + 1);

      // Manually trigger file system cache invalidation for immediate updates
      const parentDir = result.path.substring(0, result.path.lastIndexOf('/'));
      fileSystemService.invalidateCache(parentDir);
      
      // Manually trigger file system event to update file explorer immediately
      fileSystemService.handleFileSystemEvent('created', result.path, false);

      // Notify parent
      onFileChange?.(fileInfo, result.content);
      
    } catch (error) {
      console.error('Failed to save file as:', error);
      throw error;
    }
  }, [activeTab, activeTabIndex, fileTabs, fileService, onFileChange]);

  const handleOpenFile = useCallback(() => {
    setIsOpenFileDialogOpen(true);
  }, []);

  const handleOpenFileFromDialog = useCallback(async (filePath: string) => {
    try {
      const result = await fileService.openFile(filePath);

      // Check if file is already open
      const existingTabIndex = fileTabs.findIndex(tab => tab.file.path === result.path);
      if (existingTabIndex !== -1) {
        setActiveTabIndex(existingTabIndex);
        return;
      }

      // Convert FileOpenResult to FileInfo
      const fileInfo: FileInfo = {
        path: result.path,
        name: result.name,
        extension: result.name.split('.').pop() || '',
        size: result.size,
        lastModified: result.lastModified.getTime(),
        content: result.content,
        language: getLanguageFromFileName(result.name),
      };

      // Create new tab for the opened file
      const newTab: FileTab = {
        file: fileInfo,
        content: result.content,
        isModified: false,
        isPinned: false,
      };

      setFileTabs(prev => [...prev, newTab]);
      setActiveTabIndex(fileTabs.length);

      // Add to recent files
      await fileService.addToRecentFiles(result.path);
      setRecentFilePaths(prev => [result.path, ...prev.slice(0, 9)]);

      // Force file explorer refresh (in case it's a new file)
      setFileExplorerKey(prev => prev + 1);

      // Notify parent
      onFileChange?.(fileInfo, result.content);
      
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }, [fileService, fileTabs, onFileChange]);

  const handleSaveAll = useCallback(async () => {
    try {
      const modifiedTabs = fileTabs.filter(tab => tab.isModified && tab.file.path);
      if (modifiedTabs.length === 0) {
        console.log('No modified files to save');
        return;
      }

      const filesToSave = modifiedTabs.map(tab => ({
        path: tab.file.path,
        content: tab.content
      }));

      await fileService.saveAllFiles(filesToSave);
      
      // Mark all tabs as saved
      setFileTabs(prev => prev.map(tab => 
        tab.isModified ? { ...tab, isModified: false } : tab
      ));

      console.log(`✅ Saved ${modifiedTabs.length} files`);
      
    } catch (error) {
      console.error('Failed to save all files:', error);
    }
  }, [fileTabs, fileService]);

  // Helper Functions
  const getCurrentFileDirectory = useCallback((): string => {
    if (activeTab?.file.path) {
      // Check if this is an unsaved file
      if (activeTab.file.path.startsWith('<unsaved>/')) {
        // For unsaved files, return the current directory or project root
        return currentDirectory || safeProject.rootPath || '';
      }
      
      // For saved files, extract directory from path
      const lastSlashIndex = activeTab.file.path.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        return activeTab.file.path.substring(0, lastSlashIndex);
      }
    }
    return currentDirectory || safeProject.rootPath || '';
  }, [activeTab, currentDirectory, safeProject]);

  const getLanguageFromFileName = useCallback((fileName: string): string => {
    const fileInfo = fileService.getFileTypeInfo(fileName);
    return fileInfo.language;
  }, [fileService]);

  // Get current file name for Save As dialog
  const getCurrentFileName = useCallback((): string => {
    if (!activeTab) return '';
    
    // For unsaved files, provide a better default name
    if (activeTab.file.path.startsWith('<unsaved>/')) {
      return ''; // Let the user enter a name from scratch
    }
    
    // For saved files, use the current name
    return activeTab.file.name;
  }, [activeTab]);

  // Load recent files on mount
  useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        const recent = await fileService.getRecentFiles();
        setRecentFilePaths(recent);
      } catch (error) {
        console.error('Failed to load recent files:', error);
      }
    };

    loadRecentFiles();
  }, [fileService]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Esc key for closing QuickOpen
      if (e.key === 'Escape') {
        if (showQuickOpen) {
          e.preventDefault();
          e.stopPropagation();
          setShowQuickOpen(false);
          return;
        }
      }
      
      // Only handle if we have tabs and are focused
      if (fileTabs.length === 0) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Tab':
            // PRIORITY FIX: Prevent app-level tab navigation when file tabs exist
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (e.shiftKey) {
              // Previous tab
              const prevIndex = activeTabIndex <= 0 ? fileTabs.length - 1 : activeTabIndex - 1;
              setActiveTabIndex(prevIndex);
            } else {
              // Next tab
              const nextIndex = activeTabIndex >= fileTabs.length - 1 ? 0 : activeTabIndex + 1;
              setActiveTabIndex(nextIndex);
            }
            break;
          case 'w':
            e.preventDefault();
            e.stopPropagation();
            if (activeTabIndex >= 0) {
              handleTabClose(activeTabIndex);
            }
            break;
          case 's':
            if (!e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }
            break;
          case 'k':
            e.preventDefault();
            e.stopPropagation();
            handleAskAI();
            break;
          case 'g':
            e.preventDefault();
            e.stopPropagation();
            handleShowGoToLine();
            break;
          case 'n':
            if (!e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              handleNewFile();
            }
            break;
          case 'o':
            if (!e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              handleOpenFile();
            }
            break;
        }
      }
      
      // Save As (Ctrl+Shift+S)
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        handleSaveAs();
      }
      
      // Search panel toggle (Ctrl+Shift+F)
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        e.stopPropagation();
        setShowSearchPanel(prev => !prev);
      }
    };
    
    // Add event listener with capture=true to handle events before app-level handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [fileTabs, activeTabIndex, handleTabClose, handleSave, handleAskAI, showQuickOpen, handleNewFile, handleOpenFile, handleSaveAs]);

  // Configuration-based keyboard shortcuts
  useShortcut('tabManagement', 'nextTab', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    const nextIndex = activeTabIndex >= fileTabs.length - 1 ? 0 : activeTabIndex + 1;
    setActiveTabIndex(nextIndex);
    return true;
  }, [fileTabs, activeTabIndex]);

  useShortcut('tabManagement', 'previousTab', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    const prevIndex = activeTabIndex <= 0 ? fileTabs.length - 1 : activeTabIndex - 1;
    setActiveTabIndex(prevIndex);
    return true;
  }, [fileTabs, activeTabIndex]);

  useShortcut('tabManagement', 'closeTab', (e) => {
    if (fileTabs.length === 0 || activeTabIndex < 0) return false;
    e.preventDefault?.();
    handleTabClose(activeTabIndex);
    return true;
  }, [fileTabs, activeTabIndex, handleTabClose]);

  useShortcut('fileManagement', 'saveFile', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    handleSave();
    return true;
  }, [fileTabs, handleSave]);

  useShortcut('ai', 'askAI', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    handleAskAI();
    return true;
  }, [fileTabs, handleAskAI]);

  useShortcut('search', 'projectSearch', (e) => {
    e.preventDefault?.();
    setShowSearchPanel(prev => !prev);
    return true;
  }, []);

  // QuickOpen (Ctrl+P) shortcut
  useShortcut('navigation', 'quickOpen', (e) => {
    e.preventDefault?.();
    setShowQuickOpen(true);
    return true;
  }, []);

  // Go to Line (Ctrl+G) shortcut
  useShortcut('navigation', 'goToLine', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    handleShowGoToLine();
    return true;
  }, [fileTabs, handleShowGoToLine]);

  // Find in File (Ctrl+F) shortcut
  useShortcut('search', 'findInFile', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    handleOpenFind();
    return true;
  }, [fileTabs, handleOpenFind]);

  // Find and Replace in File (Ctrl+H) shortcut
  useShortcut('search', 'replaceInFile', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    handleOpenFindReplace();
    return true;
  }, [fileTabs, handleOpenFindReplace]);

  // Go to Symbol in File (Ctrl+Shift+O) shortcut
  useShortcut('navigation', 'goToSymbol', (e) => {
    if (fileTabs.length === 0) return false;
    e.preventDefault?.();
    handleGoToSymbol();
    return true;
  }, [fileTabs, handleGoToSymbol]);

  // Toggle Sidebar (Ctrl+B) shortcut
  useShortcut('views', 'toggleSidebar', (e) => {
    e.preventDefault?.();
    handleToggleSidebar();
    return true;
  }, [handleToggleSidebar]);

  // File Management Shortcuts
  useShortcut('fileManagement', 'newFile', (e) => {
    e.preventDefault?.();
    handleNewFile();
    return true;
  }, [handleNewFile]);

  useShortcut('fileManagement', 'saveAs', (e) => {
    if (fileTabs.length === 0 || activeTabIndex < 0) return false;
    e.preventDefault?.();
    handleSaveAs();
    return true;
  }, [fileTabs, activeTabIndex, handleSaveAs]);

  useShortcut('fileManagement', 'openFile', (e) => {
    e.preventDefault?.();
    handleOpenFile();
    return true;
  }, [handleOpenFile]);

  // Save All (Ctrl+Alt+S) - register with the keyboard system
  useShortcut('fileManagement', 'saveAll', (e) => {
    e.preventDefault?.();
    handleSaveAll();
    return true;
  }, [handleSaveAll]);

  // QuickOpen handlers
  const handleQuickOpenFileSelect = useCallback(async (node: FileNode) => {
    setShowQuickOpen(false);
    await handleFileSelect(node);
  }, [handleFileSelect]);

  const handleQuickOpenClose = useCallback(() => {
    setShowQuickOpen(false);
  }, []);

  // Dialog handlers
  const handleDialogSave = useCallback(async () => {
    if (unsavedDialog.tabIndex >= 0) {
      await handleSave(unsavedDialog.tabIndex);
      setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
      // Close the tab after saving
      setFileTabs(prev => prev.filter((_, i) => i !== unsavedDialog.tabIndex));
      if (unsavedDialog.tabIndex === activeTabIndex) {
        setActiveTabIndex(fileTabs.length > 1 ? Math.max(0, unsavedDialog.tabIndex - 1) : -1);
      }
    }
  }, [unsavedDialog, handleSave, fileTabs, activeTabIndex]);

  const handleDialogDontSave = useCallback(() => {
    if (unsavedDialog.tabIndex >= 0) {
      setFileTabs(prev => prev.filter((_, i) => i !== unsavedDialog.tabIndex));
      if (unsavedDialog.tabIndex === activeTabIndex) {
        setActiveTabIndex(fileTabs.length > 1 ? Math.max(0, unsavedDialog.tabIndex - 1) : -1);
      }
    }
    setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
  }, [unsavedDialog, fileTabs, activeTabIndex]);

  const handleDialogCancel = useCallback(() => {
    setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all auto-saves for all files
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, []);

  // Combined error handling
  const displayError = currentError || fileLoader.error;
  const errorMessage = displayError instanceof Error ? displayError.message : displayError;
  const handleDismissError = useCallback(() => {
    setCurrentError(null);
    fileLoader.clearError();
  }, [fileLoader]);

  return (
    <div className="flex h-full bg-vscode-bg">
      {/* File Explorer Sidebar */}
      <div className={`flex-shrink-0 border-r border-vscode-border transition-all duration-200 ${
        showSidebar ? 'w-64' : 'w-0 overflow-hidden'
      }`}>
        {/* Directory Breadcrumb */}
        {showSidebar && currentDirectory && (
          <div className="px-3 py-2 border-b border-vscode-border bg-vscode-sidebar">
            <div className="text-xs text-vscode-fg-muted">Current directory:</div>
            <div className="text-xs font-mono text-vscode-fg truncate" title={currentDirectory}>
              📁 {currentDirectory.replace(safeProject.rootPath, '.') || './'}
            </div>
          </div>
        )}
        <VirtualizedFileExplorer
          key={fileExplorerKey}
          rootPath={safeProject.rootPath}
          onFileSelect={handleFileSelect}
          height={600}
          className="h-full"
          selectedPath={activeTab?.file.path}
          onDirectoryToggle={(path: string, expanded: boolean) => {
            // Track the current directory when users navigate
            if (expanded) {
              setCurrentDirectory(path);
            }
          }}
        />
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar */}
        {fileTabs.length > 0 && (
          <div className="flex items-center bg-vscode-tab-inactive border-b border-vscode-border">
            <div className="flex overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vscode-scrollbar">
              {fileTabs.map((tab, index) => {
                const isUnsaved = tab.file.path.startsWith('<unsaved>/');
                const displayName = isUnsaved ? tab.file.name : tab.file.name;
                const tabTitle = isUnsaved ? `${tab.file.name} (unsaved)` : tab.file.path;
                
                return (
                  <div
                    key={tab.file.path}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
                      group flex items-center px-3 py-2 text-sm border-r border-vscode-border
                      cursor-pointer min-w-0 flex-shrink-0 relative
                      ${index === activeTabIndex 
                        ? 'bg-vscode-tab-active text-vscode-fg' 
                        : 'bg-vscode-tab-inactive text-vscode-fg-muted hover:bg-vscode-tab-hover'
                      }
                      ${dragOverIndex === index ? 'border-l-2 border-l-vscode-accent' : ''}
                      ${draggedTabIndex === index ? 'opacity-50' : ''}
                      ${isUnsaved ? 'italic' : ''}
                    `}
                    onClick={() => handleTabClick(index)}
                    title={tabTitle}
                  >
                    <span className="mr-2 flex-shrink-0">
                      {isUnsaved ? '📄' : getFileIcon(tab.file.extension)}
                    </span>
                    <span className="truncate">
                      {displayName}
                      {tab.isModified && <span className="ml-1 text-vscode-accent">●</span>}
                      {isUnsaved && <span className="ml-1 text-vscode-fg-muted text-xs">(unsaved)</span>}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabClose(index);
                      }}
                      className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-vscode-button-hover rounded p-1 transition-opacity"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 relative">
          {fileTabs.length === 0 ? (
            <EmptyEditorState
              project={safeProject}
            />
          ) : activeTab ? (
            <MonacoEditorWrapper
              selectedFile={{
                ...activeTab.file,
                content: activeTab.content,
                isOpen: true,
                isDirty: activeTab.isModified,
              }}
              fileContent={activeTab.content}
              perfConfig={performanceConfig.perfConfig}
              performanceMode={performanceConfig.performanceMode}
              onContentChange={handleContentChange}
              onSave={() => handleSave()}
              onAskAI={handleAskAI}
              goToLineRef={goToLineRef}
              getCurrentLineRef={getCurrentLineRef}
              getTotalLinesRef={getTotalLinesRef}
              openFindRef={openFindRef}
              openFindReplaceRef={openFindReplaceRef}
              goToSymbolRef={goToSymbolRef}
            />
          ) : null}
        </div>
      </div>

      {/* Performance Metrics */}
      {performanceConfig.performanceMode && (
        <div className="absolute top-4 right-4 z-10">
          <PerformanceMetrics
            isVisible={true}
            cacheSize={fileCache.getCacheSize ? fileCache.getCacheSize() : 0}
            perfConfig={performanceConfig.perfConfig}
          />
        </div>
      )}

      {/* Performance Mode Indicator */}
      {performanceConfig.performanceMode && (
        <div className="absolute top-4 left-4 z-10">
          <PerformanceModeIndicator
            isActive={performanceConfig.performanceMode}
            onDisable={() => performanceConfig.setPerformanceMode(false)}
          />
        </div>
      )}

      {/* Search Panel */}
      {showSearchPanel && (
        <div className="absolute inset-y-0 right-0 w-80 bg-vscode-sidebar border-l border-vscode-border z-20">
          <SearchPanel
            projectPath={safeProject.rootPath}
            onNavigateToFile={(file: string, line?: number, column?: number) => {
              // TODO: Implement navigation to file and line
              console.log('Navigate to:', file, line, column);
            }}
          />
        </div>
      )}

      {/* Quick Open */}
      {showQuickOpen && (
        <QuickOpen
          isOpen={showQuickOpen}
          projectPath={safeProject.rootPath}
          onFileSelect={handleQuickOpenFileSelect}
          onClose={handleQuickOpenClose}
          recentFiles={recentlyOpenedFiles}
        />
      )}

      {/* Go to Line Dialog */}
      <GoToLineDialog
        isOpen={showGoToLine}
        onClose={() => setShowGoToLine(false)}
        onGoToLine={handleGoToLine}
        currentLineNumber={getCurrentLineRef.current?.() || 1}
        totalLines={getTotalLinesRef.current?.() || 1}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedDialog.isOpen}
        fileName={unsavedDialog.fileName}
        onSave={handleDialogSave}
        onDontSave={handleDialogDontSave}
        onCancel={handleDialogCancel}
      />

      {/* File Management Dialogs */}
      <SaveAsDialog
        isOpen={isSaveAsDialogOpen}
        onClose={() => setIsSaveAsDialogOpen(false)}
        onSaveAs={handleSaveAsFile}
        currentFileName={getCurrentFileName()}
        currentPath={getCurrentFileDirectory()}
        projectRootPath={safeProject.rootPath}
      />

      <OpenFileDialog
        isOpen={isOpenFileDialogOpen}
        onClose={() => setIsOpenFileDialogOpen(false)}
        onOpenFile={handleOpenFileFromDialog}
        projectRootPath={safeProject.rootPath}
        recentFiles={recentFilePaths}
      />

      {/* Error Notification */}
      {displayError && (
        <ErrorNotification
          error={errorMessage || 'An unknown error occurred'}
          onDismiss={handleDismissError}
        />
      )}
    </div>
  );
}; 