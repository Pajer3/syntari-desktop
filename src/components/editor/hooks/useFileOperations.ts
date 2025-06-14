import { useCallback, useEffect, useRef } from 'react';
import type { FileInfo } from '../../../types';
import type { FileNode } from '../../../types/fileSystem';
import type { EditorState, DialogStates } from './useEditorState';
import { useFileCache } from '../useFileCache';
import { useFileLoader } from '../useFileLoader';
import { useFileSave } from '../useFileSave';

interface UseFileOperationsProps {
  editorState: EditorState;
  updateEditorState: (updates: Partial<EditorState>) => void;
  updateDialogStates: (updates: Partial<DialogStates>) => void;
  recentFilePaths: string[];
  setRecentFilePaths: (paths: string[]) => void;
  onFileChange?: (file: FileInfo, content: string) => void;
  openFileInTab: (file: FileInfo, content: string) => void;
  fileExplorerRefreshRef?: React.RefObject<() => void>;
}

export const useFileOperations = ({
  editorState,
  updateEditorState,
  updateDialogStates,
  recentFilePaths,
  setRecentFilePaths,
  onFileChange,
  openFileInTab,
  fileExplorerRefreshRef,
}: UseFileOperationsProps) => {
  const { fileTabs, activeTabIndex } = editorState;
  const activeTab = activeTabIndex >= 0 ? fileTabs[activeTabIndex] : null;

  // Use ref to always access fresh state
  const editorStateRef = useRef(editorState);
  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  // State tracking ready

  // Custom hooks for file operations
  const fileCache = useFileCache();
  const fileLoader = useFileLoader();
  const fileSaver = useFileSave();

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

  // File selection handler
  const handleFileSelect = useCallback(async (node: FileNode) => {
    // Update current directory to the parent folder of the selected file
    if (!node.isDirectory) {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      updateEditorState({ currentDirectory: parentPath });
    }

    if (node.isDirectory) {
      console.log('📁 Directory selected:', node.path);
      updateEditorState({ currentDirectory: node.path });
      return;
    }

    try {
      // Convert to FileInfo first
      const fileInfo = convertFileNode(node);
      
      // Load file content using the proper API (instant loading)
      const loadedFile = await fileLoader.loadFileContent(
        fileInfo,
        fileCache.getCachedContent,
        fileCache.setCachedContent
      );

      if (!loadedFile) {
        throw new Error('Failed to load file content');
      }

      console.log('📄 File loaded instantly:', node.name);
      
      // Open in tab
      openFileInTab(fileInfo, loadedFile.content);
      
      // Update recent files
      const newRecentFiles = [node.path, ...recentFilePaths.filter(p => p !== node.path)].slice(0, 10);
      setRecentFilePaths(newRecentFiles);
      
    } catch (error) {
      console.error('❌ Failed to load file:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to load file') 
      });
    }
  }, [
    fileCache, fileLoader, convertFileNode, openFileInTab, 
    recentFilePaths, setRecentFilePaths, updateEditorState
  ]);

  // Quick open file selection
  const handleQuickOpenFileSelect = useCallback(async (filePath: string) => {
    updateEditorState({ showQuickOpen: false });
    
    try {
      // Create FileInfo for the file path
      const fileInfo: FileInfo = {
        path: filePath,
        name: filePath.split('/').pop() || 'Unknown',
        extension: filePath.split('.').pop() || '',
        size: 0,
        lastModified: Date.now(),
        content: undefined,
      };

      // Load file content using the proper API (instant loading)
      const loadedFile = await fileLoader.loadFileContent(
        fileInfo,
        fileCache.getCachedContent,
        fileCache.setCachedContent
      );

      if (!loadedFile) {
        throw new Error('Failed to load file content');
      }

      console.log('📄 Quick open file loaded instantly:', filePath);
      
      // Open in tab
      openFileInTab(fileInfo, loadedFile.content);
      
      // Update recent files
      const newRecentFiles = [filePath, ...recentFilePaths.filter(p => p !== filePath)].slice(0, 10);
      setRecentFilePaths(newRecentFiles);
      
    } catch (error) {
      console.error('❌ Failed to quick open file:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to load file') 
      });
    }
  }, [
    fileCache, fileLoader, openFileInTab, recentFilePaths, 
    setRecentFilePaths, updateEditorState
  ]);

  // Content change handler
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTab) return;

    // Update tab content and mark as modified
    const newTabs = fileTabs.map((tab, index) => 
      index === activeTabIndex 
        ? { ...tab, content: newContent, isModified: true }
        : tab
    );
    
    updateEditorState({ fileTabs: newTabs });

    // Update cache
    fileCache.setCachedContent(activeTab.file.path, newContent);
    
    // Notify parent
    onFileChange?.(activeTab.file, newContent);
  }, [activeTab, fileTabs, activeTabIndex, fileCache, updateEditorState, onFileChange]);

  // Save file
  const handleSave = useCallback(async () => {
    // Always get fresh state from ref instead of using stale closure
    const currentState = editorStateRef.current;
    const currentTabs = currentState.fileTabs;
    const currentActiveIndex = currentState.activeTabIndex;
    const currentActiveTab = currentActiveIndex >= 0 ? currentTabs[currentActiveIndex] : null;

    if (!currentActiveTab) {
      return;
    }

    try {
      // Handle unsaved files differently
      if (currentActiveTab.file.path.startsWith('<unsaved>/')) {
        updateDialogStates({ saveAs: true });
        return;
      }

      await fileSaver.saveFile(currentActiveTab.file.path, currentActiveTab.content);
      
      // Mark tab as saved
      const newTabs = currentTabs.map((tab, index) => 
        index === currentActiveIndex 
          ? { ...tab, isModified: false }
          : tab
      );
      
      updateEditorState({ fileTabs: newTabs });
      
      // Update cache
      fileCache.setCachedContent(currentActiveTab.file.path, currentActiveTab.content);
      
    } catch (error) {
      console.error('💾 ❌ Save failed:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to save file') 
      });
    }
  }, [editorStateRef, fileSaver, fileCache, updateEditorState, updateDialogStates]);

  // Open file from dialog
  const handleOpenFileFromDialog = useCallback(async (filePath: string): Promise<void> => {
    // Same logic as quick open
    await handleQuickOpenFileSelect(filePath);
    updateDialogStates({ openFile: false });
  }, [handleQuickOpenFileSelect, updateDialogStates]);

  // Create new file handler
  const handleCreateNewFile = useCallback(async (filePath: string, fileName: string): Promise<void> => {
    try {
      // Create empty file
      await fileSaver.saveFile(filePath, '');
      
      // Create FileInfo
      const fileInfo: FileInfo = {
        path: filePath,
        name: fileName,
        extension: fileName.split('.').pop() || '',
        size: 0,
        lastModified: Date.now(),
        content: '',
      };
      
      // Open in tab
      openFileInTab(fileInfo, '');
      
      updateDialogStates({ newFile: false });
      console.log('✅ New file created:', filePath);
      
    } catch (error) {
      console.error('❌ Failed to create new file:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to create file') 
      });
    }
  }, [fileSaver, openFileInTab, updateEditorState, updateDialogStates]);

  // Save as file handler
  const handleSaveAsFile = useCallback(async (selectedPath: string, fileName: string): Promise<void> => {
    if (!activeTab) return;

    // Construct the full file path by combining directory and filename
    const fullFilePath = `${selectedPath}/${fileName}`;

    try {
      
      await fileSaver.saveFile(fullFilePath, activeTab.content);
      
      // Clear file system cache to ensure new file appears in explorer
      const { fileSystemService } = await import('../../../services/fileSystemService');
      fileSystemService.clearFolderCache(selectedPath);
      fileSystemService.invalidateAllCaches();
      
      // Update the tab with new file info
      const newFileInfo: FileInfo = {
        ...activeTab.file,
        path: fullFilePath,
        name: fileName,
      };

      const newTabs = fileTabs.map((tab, index) => 
        index === activeTabIndex 
          ? { ...tab, file: newFileInfo, isModified: false }
          : tab
      );
      
      updateEditorState({ 
        fileTabs: newTabs
      });
      updateDialogStates({ saveAs: false });
      
      console.log('✅ File saved as:', fullFilePath);
      
      // Use ref-based refresh to preserve expanded folders
      if (fileExplorerRefreshRef?.current) {
        fileExplorerRefreshRef.current();
      } else {
        // Fallback to key-based refresh if ref not available
        const currentState = editorStateRef.current;
        updateEditorState({ 
          fileExplorerKey: currentState.fileExplorerKey + 1 
        });
      }
      
      // Additional refresh after a delay to ensure filesystem sync
      setTimeout(() => {
        if (fileExplorerRefreshRef?.current) {
          fileExplorerRefreshRef.current();
        } else {
          const currentState = editorStateRef.current;
          updateEditorState({ 
            fileExplorerKey: currentState.fileExplorerKey + 1 
          });
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to save file as:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to save file') 
      });
    }
  }, [activeTab, fileTabs, activeTabIndex, fileSaver, updateEditorState, updateDialogStates, editorStateRef]);

  return {
    handleFileSelect,
    handleQuickOpenFileSelect,
    handleContentChange,
    handleSave,
    handleSaveAsFile,
    handleOpenFileFromDialog,
    handleCreateNewFile,
    activeTab,
  };
}; 