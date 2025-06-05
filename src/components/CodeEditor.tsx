// Syntari AI IDE - Enhanced Code Editor with Multi-Tab Support
// Professional editor with VS Code-style tab management

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  // Core state
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showGoToLine, setShowGoToLine] = useState(false);
  
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
  
  // Unsaved changes dialog
  const [unsavedDialog, setUnsavedDialog] = useState<{
    isOpen: boolean;
    tabIndex: number;
    fileName: string;
  }>({ isOpen: false, tabIndex: -1, fileName: '' });

  // Get active tab
  const activeTab = activeTabIndex >= 0 ? fileTabs[activeTabIndex] : null;

  // Get recently opened files for QuickOpen prioritization
  const recentFiles = fileTabs.map(tab => tab.file.path);

  // Convert FileNode to FileInfo for compatibility
  const convertFileNode = useCallback((node: FileNode): FileInfo => ({
    path: node.path,
    name: node.name,
    extension: node.extension,
    size: node.size || 0,
    lastModified: node.lastModified,
    content: undefined,
    language: node.isDirectory ? 'directory' : undefined,
  }), []);

  // File selection handler
  const handleFileSelect = useCallback(async (node: FileNode) => {
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

  // Handle saving
  const handleSave = useCallback(async (tabIndex?: number) => {
    const targetIndex = tabIndex ?? activeTabIndex;
    if (targetIndex < 0) return;

    const tab = fileTabs[targetIndex];
    if (!tab) return;

    try {
      const editorFile: EditorFile = {
        ...tab.file,
        content: tab.content,
        isOpen: true,
        isDirty: tab.isModified,
      };
      
      const success = await fileSaver.saveFile(
        editorFile,
        tab.content,
        fileCache.setCachedContent
      );
      
      if (success) {
        setFileTabs(prev => prev.map((t, index) => 
          index === targetIndex ? { ...t, isModified: false } : t
        ));
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      setCurrentError(error as Error);
    }
  }, [activeTabIndex, fileTabs, fileSaver, fileCache]);

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
            e.preventDefault();
            e.stopPropagation();
            handleSave();
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
          case 'p':
            // QuickOpen (Ctrl+P) - Let useShortcut handle this
            // Remove this case to avoid conflicts
            break;
        }
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
  }, [fileTabs, activeTabIndex, handleTabClose, handleSave, handleAskAI, showQuickOpen]);

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
      fileSaver.cancelAutoSave();
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, [fileSaver]);

  // Combined error handling
  const displayError = currentError || fileLoader.error || fileSaver.saveError;
  const errorMessage = displayError instanceof Error ? displayError.message : displayError;
  const handleDismissError = useCallback(() => {
    setCurrentError(null);
    fileLoader.clearError();
    fileSaver.clearSaveError();
  }, [fileLoader, fileSaver]);
  
  return (
    <div className={`flex h-full bg-vscode-bg text-vscode-fg font-mono ${performanceConfig.performanceMode ? 'performance-mode' : ''}`}>
      {/* High-Performance File Explorer Sidebar */}
      <div className="w-64 flex-shrink-0 bg-vscode-sidebar border-r border-vscode-border">
        <VirtualizedFileExplorer
          rootPath={project.rootPath}
          selectedPath={activeTab?.file.path}
          onFileSelect={handleFileSelect}
          height={window.innerHeight - 100}
          className="h-full"
        />
      </div>
      
      {/* Search Panel (Collapsible) */}
      {showSearchPanel && (
        <div className="w-80 flex-shrink-0">
          <SearchPanel
            projectPath={project.rootPath}
            onNavigateToFile={(filePath) => {
              // TODO: Navigate to file in tabs
              console.log('Navigate to:', filePath);
            }}
            isVisible={showSearchPanel}
            onToggleVisibility={() => setShowSearchPanel(false)}
          />
        </div>
      )}
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Performance Mode Indicator */}
        <PerformanceModeIndicator
          isActive={performanceConfig.performanceMode}
          onDisable={() => performanceConfig.setPerformanceMode(false)}
        />

        {/* Error Notification */}
        <ErrorNotification
          error={errorMessage}
          onDismiss={handleDismissError}
        />

        {/* File Tabs */}
        {fileTabs.length > 0 && (
          <div className="flex items-center bg-vscode-tab-bg border-b border-vscode-border min-h-[35px] overflow-x-auto">
            {fileTabs.map((tab, index) => (
              <div
                key={tab.file.path}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => handleTabClick(index)}
                className={`
                  flex items-center px-3 py-1.5 border-r border-vscode-border cursor-pointer
                  min-w-[100px] max-w-[180px] relative group
                  ${index === activeTabIndex 
                    ? 'bg-vscode-bg text-vscode-fg border-t-2 border-t-vscode-accent' 
                    : 'bg-vscode-tab-bg text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg'
                  }
                  ${draggedTabIndex === index ? 'opacity-50' : ''}
                  ${dragOverIndex === index ? 'border-l-2 border-l-vscode-accent' : ''}
                  ${tab.isPinned ? 'border-b-2 border-b-blue-400' : ''}
                  transition-colors duration-100
                `}
              >
                {/* Tab Icon */}
                <span className="mr-2 text-sm flex-shrink-0">
                  {getFileIcon(tab.file.extension)}
                </span>
                
                {/* Tab Title */}
                <span className="flex-1 truncate text-sm">
                  {tab.file.name}
                </span>
                
                {/* Modified Indicator */}
                {tab.isModified && (
                  <span className="w-2 h-2 bg-vscode-accent rounded-full ml-2 flex-shrink-0" title="Unsaved changes"></span>
                )}
                
                {/* Close Button */}
            <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClose(index);
                  }}
                  className="ml-2 w-4 h-4 flex items-center justify-center rounded hover:bg-vscode-button-hover opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Close tab"
                >
                  <span className="text-xs text-vscode-fg-muted hover:text-vscode-fg">×</span>
            </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Editor Content */}
        <div className="flex-1 relative">
          {activeTab ? (
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
              isLoading={fileLoader.isLoading}
              goToLineRef={goToLineRef}
              getCurrentLineRef={getCurrentLineRef}
              getTotalLinesRef={getTotalLinesRef}
            />
          ) : (
            <EmptyEditorState project={project} />
          )}
        </div>
      </div>
      
      {/* Performance Metrics (Debug) */}
      <PerformanceMetrics
        isVisible={performanceConfig.performanceMode}
        cacheSize={fileCache.getCacheSize()}
        perfConfig={performanceConfig.perfConfig}
      />

      {/* Quick Open Dialog (Ctrl+P) */}
      <QuickOpen
        isOpen={showQuickOpen}
        projectPath={project.rootPath}
        onClose={handleQuickOpenClose}
        onFileSelect={handleQuickOpenFileSelect}
        recentFiles={recentFiles}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedDialog.isOpen}
        fileName={unsavedDialog.fileName}
        onSave={handleDialogSave}
        onDontSave={handleDialogDontSave}
        onCancel={handleDialogCancel}
      />

      {/* Go to Line Dialog */}
      <GoToLineDialog
        isOpen={showGoToLine}
        onClose={() => setShowGoToLine(false)}
        onGoToLine={handleGoToLine}
        currentLineNumber={getCurrentLineRef.current ? getCurrentLineRef.current() : 1}
        totalLines={getTotalLinesRef.current ? getTotalLinesRef.current() : 100}
      />
    </div>
  );
}; 