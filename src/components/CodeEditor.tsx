// Syntari AI IDE - Code Editor Component
// Refactored modular architecture for better maintainability and performance

import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { ProjectContext, FileInfo } from '../types';
import { useEditorState } from './editor/hooks/useEditorState';
import { useTabManager } from './editor/hooks/useTabManager';
import { useFileOperations } from './editor/hooks/useFileOperations';
import { useEditorShortcuts } from './editor/hooks/useEditorShortcuts';
import { EditorLayout } from './editor/EditorLayout';
import { TabContextMenu } from './editor/TabContextMenu';
import { commandService } from '../services';

interface CodeEditorProps {
  project: ProjectContext;
  onFileChange?: (file: FileInfo | null) => void;
  onRequestAI?: (context: any) => void;
  className?: string;
  fileExplorerRefreshRef?: React.RefObject<() => void>;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
  className = '',
  fileExplorerRefreshRef
}) => {
  // Create a ref for FileExplorer refresh - use the passed ref or create a new one
  const internalFileExplorerRefreshRef = useRef<() => void>(null);
  const activeFileExplorerRefreshRef = fileExplorerRefreshRef || internalFileExplorerRefreshRef;

  // Refs for Monaco Editor integration
  const goToLineRef = useRef<((lineNumber: number, column?: number) => void) | null>(null);
  const getCurrentLineRef = useRef<(() => number) | null>(null);
  const getTotalLinesRef = useRef<(() => number) | null>(null);
  const openFindRef = useRef<(() => void) | null>(null);
  const openFindReplaceRef = useRef<(() => void) | null>(null);
  const goToSymbolRef = useRef<(() => void) | null>(null);
  const monacoEditorRef = useRef<any>(null);
  
  // Recent files state
  const [recentFilePaths, setRecentFilePaths] = useState<string[]>([]);
  
  // Core state management
  const { editorState, dialogStates, updateEditorState, updateDialogStates } = useEditorState(project);

  // Enhanced tab manager
  const {
    handleTabSelect,
    handleTabClose,
    handleTabMove,
    handleTabContextMenu,
    contextMenu,
    handleContextMenuAction,
    closeContextMenu,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFileInTab,
    createNewFile,
    reopenRecentlyClosedTab
  } = useTabManager({
    editorState,
    updateEditorState,
    onFileChange: (file: FileInfo) => {
      onFileChange?.(file);
    }
  });

  // File operations
  const {
    handleFileSelect,
    handleQuickOpenFileSelect,
    handleContentChange,
    handleSave,
    handleSaveAsFile,
    handleOpenFileFromDialog,
    handleCreateNewFile,
    activeTab
  } = useFileOperations({
    editorState,
    updateEditorState,
    updateDialogStates,
    recentFilePaths,
    setRecentFilePaths,
    onFileChange: (file: FileInfo) => {
      onFileChange?.(file);
    },
    openFileInTab,
    fileExplorerRefreshRef: activeFileExplorerRefreshRef
  });

  // Go to line helper functions for refs
  const getCurrentLine = useCallback(() => {
    return getCurrentLineRef.current?.() || 1;
  }, []);

  const getTotalLines = useCallback(() => {
    return getTotalLinesRef.current?.() || 1;
  }, []);

  // Tab navigation functions
  const handleNextTab = useCallback(() => {
    const { fileTabs, activeTabIndex } = editorState;
    if (fileTabs.length > 1) {
      const nextIndex = (activeTabIndex + 1) % fileTabs.length;
      handleTabSelect(nextIndex);
    }
  }, [editorState, handleTabSelect]);

  const handlePreviousTab = useCallback(() => {
    const { fileTabs, activeTabIndex } = editorState;
    if (fileTabs.length > 1) {
      const prevIndex = activeTabIndex === 0 ? fileTabs.length - 1 : activeTabIndex - 1;
      handleTabSelect(prevIndex);
    }
  }, [editorState, handleTabSelect]);

  const handleSwitchToTab = useCallback((tabIndex: number) => {
    const { fileTabs } = editorState;
    if (tabIndex >= 0 && tabIndex < fileTabs.length) {
      handleTabSelect(tabIndex);
    }
  }, [editorState, handleTabSelect]);

  const handleCloseCurrentTab = useCallback(() => {
    console.log('🔑 handleCloseCurrentTab called, activeTabIndex:', editorState.activeTabIndex);
    console.log('🔑 fileTabs:', editorState.fileTabs);
    
    if (editorState.activeTabIndex >= 0 && editorState.activeTabIndex < editorState.fileTabs.length) {
      console.log('🔑 Closing tab at index:', editorState.activeTabIndex);
      handleTabClose(editorState.activeTabIndex);
    } else {
      console.log('🔑 Invalid activeTabIndex, cannot close tab');
    }
  }, [handleTabClose, editorState.activeTabIndex, editorState.fileTabs]);

  // Use the tab manager's reopen function
  const handleReopenRecentTab = useCallback(() => {
    console.log('🔑 DEBUG: handleReopenRecentTab called - calling reopenRecentlyClosedTab()');
    reopenRecentlyClosedTab();
  }, [reopenRecentlyClosedTab]);

  // Shortcut handler functions
  const handleShowQuickOpen = useCallback(() => {
    updateEditorState({ showQuickOpen: true });
  }, [updateEditorState]);

  const handleShowCommandPalette = useCallback(() => {
    updateEditorState({ showCommandPalette: true });
  }, [updateEditorState]);

  const handleToggleSidebar = useCallback(() => {
    updateEditorState({ showSidebar: !editorState.showSidebar });
  }, [editorState.showSidebar, updateEditorState]);

  const handleShowGoToLine = useCallback(() => {
    updateEditorState({ showGoToLine: true });
  }, [updateEditorState]);

  const handleShowFind = useCallback(() => {
    if (openFindRef.current) {
      openFindRef.current();
    }
  }, []);

  const handleShowFindReplace = useCallback(() => {
    if (openFindReplaceRef.current) {
      openFindReplaceRef.current();
    }
  }, []);

  const handleShowGoToSymbol = useCallback(() => {
    if (goToSymbolRef.current) {
      goToSymbolRef.current();
    }
  }, []);

  const handleShowAIAssistant = useCallback(() => {
    // Feature disabled - focusing on core IDE functionality first
    console.log('AI Assistant integration will be implemented after core features are complete');
  }, []);

  const handleOpenFile = useCallback(() => {
    updateDialogStates({ openFile: true });
  }, [updateDialogStates]);

  // AI integration handler
  const handleAskAI = useCallback((context: any) => {
    onRequestAI?.(context);
  }, [onRequestAI]);

  // Initialize command service on mount
  useEffect(() => {
    commandService.initialize().catch(error => {
      console.error('Failed to initialize command service:', error);
    });
  }, []);

  // Add syntari:command event listener to handle commands from keyboard shortcuts
  useEffect(() => {
    const handleSyntariCommand = (event: CustomEvent) => {
      const { type } = event.detail;
      console.log('🔑 Syntari command received:', type);
      
      switch (type) {
        case 'save-file':
          console.log('🔑 Executing save-file');
          handleSave();
          break;
        case 'close-tab':
          console.log('🔑 Executing close-tab');
          handleCloseCurrentTab();
          break;
        case 'command-palette':
          console.log('🔑 Executing command-palette');
          handleShowCommandPalette();
          break;
        case 'save-as':
          updateDialogStates({ saveAs: true });
          break;
        case 'new-file':
          createNewFile();
          break;
        case 'open-file':
          updateDialogStates({ openFile: true });
          break;
        case 'find':
          handleShowFind();
          break;
        case 'find-replace':
          handleShowFindReplace();
          break;
        case 'toggle-sidebar':
          handleToggleSidebar();
          break;
        case 'reopen-tab':
          handleReopenRecentTab();
          break;
        case 'next-tab':
          handleNextTab();
          break;
        case 'previous-tab':
          handlePreviousTab();
          break;
        case 'go-to-line':
          handleShowGoToLine();
          break;
        case 'open-file-dialog':
          console.log('🔑 Executing open-file-dialog');
          updateDialogStates({ openFile: true });
          break;
        case 'save-as-dialog':
          console.log('🔑 Executing save-as-dialog');
          updateDialogStates({ saveAs: true });
          break;
        case 'reopen-recent-tab':
          console.log('🔑 Executing reopen-recent-tab');
          console.log('🔑 DEBUG: About to call handleReopenRecentTab()');
          handleReopenRecentTab();
          break;
        default:
          console.log('🔑 Unhandled command:', type);
      }
    };

    // FOCUSED Global keydown handler - prevent browser defaults AND dispatch commands
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      
      // FOCUSED: Only handle our critical shortcuts - prevent browser AND dispatch command
      
      // 1. Ctrl+S - Prevent browser Save Page dialog AND trigger save
      if (isCtrl && e.key === 's' && !isShift) {
        console.log('🔑 Global: Preventing browser Ctrl+S and dispatching save-file');
        e.preventDefault();
        e.stopPropagation();
        // Dispatch the actual command
        window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'save-file' } }));
        return;
      }
      
      // 2. Ctrl+W - Prevent browser Close Tab AND close current tab
      if (isCtrl && e.key === 'w' && !isShift) {
        console.log('🔑 Global: Preventing browser Ctrl+W and dispatching close-tab');
        e.preventDefault();
        e.stopPropagation();
        // Dispatch the actual command
        window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'close-tab' } }));
        return;
      }
      
      // 3. Ctrl+Shift+P - Prevent browser print dialog AND open command palette
      if (isCtrl && isShift && e.key === 'P') {
        console.log('🔑 Global: Preventing browser Ctrl+Shift+P and dispatching command-palette');
        e.preventDefault();
        e.stopPropagation();
        // Dispatch the actual command
        window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'command-palette' } }));
        return;
      }
      
      // 4. Ctrl+O - Open file from project tree
      if (isCtrl && e.key === 'o' && !isShift) {
        console.log('🔑 Global: Preventing browser Ctrl+O and dispatching open-file-dialog');
        e.preventDefault();
        e.stopPropagation();
        // Dispatch the actual command
        window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'open-file-dialog' } }));
        return;
      }
      
      // 5. Ctrl+Shift+S - Save as dialog
      if (isCtrl && isShift && e.key === 'S') {
        console.log('🔑 Global: Preventing browser Ctrl+Shift+S and dispatching save-as-dialog');
        e.preventDefault();
        e.stopPropagation();
        // Dispatch the actual command
        window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'save-as-dialog' } }));
        return;
      }
      
      // 6. Ctrl+Shift+T - Reopen recently closed tab
      if (isCtrl && isShift && e.key === 'T') {
        console.log('🔑 Global: Preventing browser Ctrl+Shift+T and dispatching reopen-recent-tab');
        console.log('🔑 DEBUG: CTRL+SHIFT+T pressed - reopen recently closed tab');
        e.preventDefault();
        e.stopPropagation();
        // Dispatch the actual command
        window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'reopen-recent-tab' } }));
        return;
      }
    };

    window.addEventListener('syntari:command', handleSyntariCommand as EventListener);
    window.addEventListener('keydown', handleGlobalKeydown, true); // Use capture phase
    
    return () => {
      window.removeEventListener('syntari:command', handleSyntariCommand as EventListener);
      window.removeEventListener('keydown', handleGlobalKeydown, true);
    };
  }, [
    handleSave, 
    updateDialogStates, 
    createNewFile, 
    handleShowFind, 
    handleShowFindReplace, 
    handleToggleSidebar,
    editorState,
    handleCloseCurrentTab,
    handleReopenRecentTab,
    handleNextTab,
    handlePreviousTab,
    handleShowCommandPalette,
    handleShowGoToLine
  ]);

  // Keyboard shortcuts
  useEditorShortcuts({
    onSave: handleSave,
    onNewFile: createNewFile,
    onOpenFile: handleOpenFile,
    onShowQuickOpen: handleShowQuickOpen,
    onShowCommandPalette: handleShowCommandPalette,
    onToggleSidebar: handleToggleSidebar,
    onShowGoToLine: handleShowGoToLine,
    onShowFind: handleShowFind,
    onShowFindReplace: handleShowFindReplace,
    onShowGoToSymbol: handleShowGoToSymbol,
    onCloseCurrentTab: handleCloseCurrentTab,
    onReopenRecentTab: handleReopenRecentTab,
    onNextTab: handleNextTab,
    onPreviousTab: handlePreviousTab,
    onSwitchToTab: handleSwitchToTab,
    onShowAIAssistant: handleShowAIAssistant
  });

  // Dialog handlers
  const handleQuickOpenSelect = useCallback((filePath: string) => {
    updateEditorState({ showQuickOpen: false });
    handleQuickOpenFileSelect(filePath);
  }, [updateEditorState, handleQuickOpenFileSelect]);

  const handleGoToLine = useCallback((lineNumber: number, column?: number) => {
    if (goToLineRef.current) {
      goToLineRef.current(lineNumber, column);
    }
    updateEditorState({ showGoToLine: false });
  }, [updateEditorState]);

  // This is now handled directly in EditorLayout

  // Unsaved dialog handlers
  const handleDialogSave = useCallback(() => {
    handleSave();
    updateDialogStates({ 
      unsavedChanges: { 
        isOpen: false, 
        tabIndex: -1,
        fileName: ''
      } 
    });
  }, [handleSave, updateDialogStates]);

  const handleDialogDontSave = useCallback(() => {
    updateDialogStates({ 
      unsavedChanges: { 
        isOpen: false, 
        tabIndex: -1,
        fileName: ''
      } 
    });
  }, [updateDialogStates]);

  const handleDialogCancel = useCallback(() => {
    updateDialogStates({ 
      unsavedChanges: { 
        isOpen: false, 
        tabIndex: -1,
        fileName: ''
      } 
    });
  }, [updateDialogStates]);

  // Safe project context
  const safeProject = project || {
    rootPath: '',
    name: 'Unknown Project',
    files: [],
    folders: []
  };

  if (!safeProject.rootPath) {
    return (
      <div className={`h-full flex items-center justify-center bg-vscode-editor ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4 text-vscode-fg-muted">📁</div>
          <h2 className="text-xl font-semibold text-vscode-fg mb-2">No Project Open</h2>
          <p className="text-vscode-fg-muted">Please open a project to start editing files</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full bg-vscode-editor ${className}`} style={{ minHeight: '400px' }}>
      <EditorLayout
        editorState={editorState}
        dialogStates={dialogStates}
        recentFilePaths={recentFilePaths}
        safeProject={safeProject}
        activeTab={activeTab}
        onFileSelect={handleFileSelect}
        onContentChange={handleContentChange}
        onSave={handleSave}
        onAskAI={handleAskAI}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onTabContextMenu={handleTabContextMenu}
        onTabMove={handleTabMove}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onQuickOpenFileSelect={handleQuickOpenSelect}
        onOpenFileFromDialog={handleOpenFileFromDialog}
        onSaveAsFile={handleSaveAsFile}
        onCreateNewFile={handleCreateNewFile}
        onGoToLine={handleGoToLine}
        onDialogSave={handleDialogSave}
        onDialogDontSave={handleDialogDontSave}
        onDialogCancel={handleDialogCancel}
        updateEditorState={updateEditorState}
        updateDialogStates={updateDialogStates}
        createNewFile={createNewFile}
        handleOpenFile={handleOpenFile}
        getCurrentLine={getCurrentLine}
        getTotalLines={getTotalLines}
        goToLineRef={goToLineRef}
        getCurrentLineRef={getCurrentLineRef}
        getTotalLinesRef={getTotalLinesRef}
        openFindRef={openFindRef}
        openFindReplaceRef={openFindReplaceRef}
        goToSymbolRef={goToSymbolRef}
        monacoEditorRef={monacoEditorRef}
        openFileInTab={openFileInTab}
        fileExplorerRefreshRef={activeFileExplorerRefreshRef}
      />
      
      {/* Tab Context Menu */}
      <TabContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        tabIndex={contextMenu.tabIndex}
        tab={contextMenu.tabIndex >= 0 ? editorState.fileTabs[contextMenu.tabIndex] : null}
        totalTabs={editorState.fileTabs.length}
        onClose={closeContextMenu}
        onAction={handleContextMenuAction}
      />
    </div>
  );
}; 