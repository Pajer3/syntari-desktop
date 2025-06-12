import { useState, useCallback, useRef } from 'react';
import type { ProjectContext, FileInfo } from '../../../types';

export interface FileTab {
  file: FileInfo;
  content: string;
  isModified: boolean;
  isPinned: boolean;
}

export interface EditorState {
  fileTabs: FileTab[];
  activeTabIndex: number;
  showSearchPanel: boolean;
  showQuickOpen: boolean;
  currentError: Error | null;
  draggedTabIndex: number | null;
  dragOverIndex: number | null;
  showGoToLine: boolean;
  showSidebar: boolean;
  currentDirectory: string;
  fileExplorerKey: number;
  isLoading: boolean;
  unsavedFileCounter: number;
}

export interface UnsavedDialog {
  isOpen: boolean;
  tabIndex: number;
  fileName: string;
}

export interface DialogStates {
  saveAs: boolean;
  openFile: boolean;
  newFile: boolean;
  templateManager: boolean;
  unsavedChanges: UnsavedDialog;
}

export const useEditorState = (project: ProjectContext) => {
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

  // Core editor state with lazy initialization to prevent reset on re-renders
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    fileTabs: [],
    activeTabIndex: -1,
    showSearchPanel: false,
    showQuickOpen: false,
    currentError: null,
    draggedTabIndex: null,
    dragOverIndex: null,
    showGoToLine: false,
    showSidebar: true,
    currentDirectory: safeProject.rootPath || '',
    fileExplorerKey: 0,
    isLoading: false,
    unsavedFileCounter: 1,
  }));

  // Dialog states with lazy initialization
  const [dialogStates, setDialogStates] = useState<DialogStates>(() => ({
    saveAs: false,
    openFile: false,
    newFile: false,
    templateManager: false,
    unsavedChanges: { isOpen: false, tabIndex: -1, fileName: '' },
  }));

  // Other state with lazy initialization
  const [recentFilePaths, setRecentFilePaths] = useState<string[]>(() => []);

  // Refs for optimization
  const contentChangeTimeoutRef = useRef<number>();
  const goToLineRef = useRef<((lineNumber: number, column?: number) => void) | null>(null);
  const getCurrentLineRef = useRef<(() => number) | null>(null);
  const getTotalLinesRef = useRef<(() => number) | null>(null);
  const openFindRef = useRef<(() => void) | null>(null);
  const openFindReplaceRef = useRef<(() => void) | null>(null);
  const goToSymbolRef = useRef<(() => void) | null>(null);
  const monacoEditorRef = useRef<any>(null);

  // State update helpers
  const updateEditorState = useCallback((updates: Partial<EditorState>) => {
    setEditorState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateDialogStates = useCallback((updates: Partial<DialogStates>) => {
    setDialogStates(prev => {
      const newState = { ...prev, ...updates };
      return newState;
    });
  }, []);

  // Computed values
  const activeTab = editorState.activeTabIndex >= 0 ? editorState.fileTabs[editorState.activeTabIndex] : null;
  const recentlyOpenedFiles = editorState.fileTabs.map(tab => tab.file.path);

  return {
    // State
    editorState,
    dialogStates,
    recentFilePaths,
    safeProject,
    
    // Computed
    activeTab,
    recentlyOpenedFiles,
    
    // State setters
    setEditorState,
    setDialogStates,
    setRecentFilePaths,
    updateEditorState,
    updateDialogStates,
    
    // Refs
    contentChangeTimeoutRef,
    goToLineRef,
    getCurrentLineRef,
    getTotalLinesRef,
    openFindRef,
    openFindReplaceRef,
    goToSymbolRef,
    monacoEditorRef,
  };
}; 