// Syntari AI IDE - Code Editor Component
// Refactored modular architecture for better maintainability and performance

import React, { useRef, useCallback, useState } from 'react';
import type { ProjectContext, FileInfo } from '../types';
// import type { FileNode } from '../types/fileSystem'; // Unused
import { useEditorState } from './editor/hooks/useEditorState';
import { useTabManager } from './editor/hooks/useTabManager';
import { useFileOperations } from './editor/hooks/useFileOperations';
import { useEditorShortcuts } from './editor/hooks/useEditorShortcuts';
import { EditorLayout } from './editor/EditorLayout';
import { TabContextMenu } from './editor/TabContextMenu';

interface CodeEditorProps {
  project: ProjectContext;
  onFileChange?: (file: FileInfo | null) => void;
  onRequestAI?: (context: any) => void;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
  className = ''
}) => {
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
    createNewFile
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
    openFileInTab
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
    handleTabClose(editorState.activeTabIndex);
  }, [handleTabClose, editorState.activeTabIndex]);

  // Reopen recently closed tab function
  const handleReopenRecentTab = useCallback(() => {
    console.log('🔄 Reopen recently closed tab (not yet implemented)');
    // TODO: Implement reopen recently closed tab functionality
  }, []);

  // Shortcut handler functions
  const handleShowQuickOpen = useCallback(() => {
    updateEditorState({ showQuickOpen: true });
  }, [updateEditorState]);

  const handleShowCommandPalette = useCallback(() => {
    console.log('🎯 Command palette (not yet implemented)');
    // TODO: Implement command palette
  }, []);

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
    console.log('🤖 Ask AI assistant (not yet implemented)');
    // TODO: Implement AI assistant dialog
  }, []);

  const handleOpenFile = useCallback(() => {
    updateDialogStates({ openFile: true });
  }, [updateDialogStates]);

  // AI integration handler
  const handleAskAI = useCallback((context: any) => {
    console.log('🤖 AI assistant requested with context:', context);
    onRequestAI?.(context);
  }, [onRequestAI]);

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

  // Wrapper for NewFileDialog interface compatibility
  const handleNewFileDialogCreate = useCallback(async (fileName: string) => {
    const { currentDirectory } = editorState;
    const fullPath = `${currentDirectory}/${fileName}`;
    await handleCreateNewFile(fullPath, fileName);
  }, [editorState, handleCreateNewFile]);

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
      onCreateNewFile={handleNewFileDialogCreate}
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