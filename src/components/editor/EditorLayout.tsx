import React, { useRef } from 'react';
import { Terminal } from 'lucide-react';
import type { ProjectContext } from '../../types';
import type { FileNode } from '../../types/fileSystem';
import type { FileTab, EditorState, DialogStates } from './hooks/useEditorState';
import { FileExplorer } from './FileExplorer';
import { MonacoEditorWrapper } from './MonacoEditorWrapper';
import { SimpleMonacoWrapper } from './SimpleMonacoWrapper';
import { FileTabBar } from './FileTabBar';
import { SearchPanel } from './search/SearchPanel';
import { EditorFooter } from './EditorFooter';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { GoToLineDialog } from './GoToLineDialog';
import { QuickOpen } from '../QuickOpen';
import { SaveAsDialog } from './dialogs/SaveAsDialog';
import { OpenFileDialog } from './dialogs/OpenFileDialog';
import { NewFileDialog } from './dialogs/NewFileDialog';
import { NewFolderDialog } from './dialogs/NewFolderDialog';
import { TemplateManagerDialog } from './dialogs/TemplateManagerDialog';
import { CommandPalette } from '../ui/CommandPalette';
import { usePerformanceConfig } from './usePerformanceConfig';
import { useFileSave } from './useFileSave';
import type { FileInfo } from '../../types';

interface EditorLayoutProps {
  // State
  editorState: EditorState;
  dialogStates: DialogStates;
  recentFilePaths: string[];
  safeProject: ProjectContext;
  activeTab: FileTab | null;
  
  // Handlers
  onFileSelect: (node: FileNode) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onAskAI: (context: any) => void;
  
  // Tab handlers
  onTabSelect: (index: number) => void;
  onTabClose: (index: number) => void;
  onTabContextMenu: (index: number, event: React.MouseEvent) => void;
  onTabMove: (fromIndex: number, toIndex: number) => void;
  
  // Drag and drop handlers
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
  
  // Dialog handlers
  onQuickOpenFileSelect: (filePath: string) => void;
  onOpenFileFromDialog: (filePath: string) => void;
  onSaveAsFile: (filePath: string, fileName: string) => void;
  onCreateNewFile: (filePath: string, fileName: string) => void;
  onGoToLine: (lineNumber: number, column?: number) => void;
  
  // Unsaved dialog handlers
  onDialogSave: () => void;
  onDialogDontSave: () => void;
  onDialogCancel: () => void;
  
  // State updaters
  updateEditorState: (updates: Partial<EditorState>) => void;
  updateDialogStates: (updates: Partial<DialogStates>) => void;
  
  // New file handler
  createNewFile: () => void;
  handleOpenFile: () => void;
  openFileInTab: (file: FileInfo, content: string) => void;
  
  // Current line info
  getCurrentLine: () => number;
  getTotalLines: () => number;
  
  // Refs
  goToLineRef: React.RefObject<((lineNumber: number, column?: number) => void) | null>;
  getCurrentLineRef: React.RefObject<(() => number) | null>;
  getTotalLinesRef: React.RefObject<(() => number) | null>;
  openFindRef: React.RefObject<(() => void) | null>;
  openFindReplaceRef: React.RefObject<(() => void) | null>;
  goToSymbolRef: React.RefObject<(() => void) | null>;
  monacoEditorRef: React.RefObject<any>;
  fileExplorerRefreshRef: React.RefObject<() => void>;
}

// Add template manager state to DialogStates interface extension
interface ExtendedDialogStates extends DialogStates {
  templateManager: boolean;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  editorState,
  dialogStates,
  recentFilePaths,
  safeProject,
  activeTab,
  onFileSelect,
  onContentChange,
  onSave,
  onAskAI,
  onTabSelect,
  onTabClose,
  onTabContextMenu,
  onTabMove,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onQuickOpenFileSelect,
  onOpenFileFromDialog,
  onSaveAsFile,
        onCreateNewFile: handleCreateNewFileOld,
  onGoToLine,
  onDialogSave,
  onDialogDontSave,
  onDialogCancel,
  updateEditorState,
  updateDialogStates,
  createNewFile,
  handleOpenFile,
  getCurrentLine,
  getTotalLines,
  
  monacoEditorRef,
  openFileInTab,
  fileExplorerRefreshRef,
}) => {
  const performanceConfig = usePerformanceConfig();
  const fileSaver = useFileSave();

  // Use the passed ref directly - CodeEditor now manages the ref
  const activeFileExplorerRefreshRef = fileExplorerRefreshRef;
  
  const {
    fileTabs,
    activeTabIndex,
    currentDirectory,
    showSearchPanel,
    showQuickOpen,
    showCommandPalette,
    showGoToLine,
    showSidebar,
    fileExplorerKey,
    showFooter,
    activeFooterPanel,
    footerHeight,
  } = editorState;

  const {
    saveAs: isSaveAsDialogOpen,
    openFile: isOpenFileDialogOpen,
    newFile: isNewFileDialogOpen,
    newFolder: isNewFolderDialogOpen,
    unsavedChanges: unsavedDialog,
  } = dialogStates;

  // Dialog states ready

  // Extended dialog states with template manager
  const extendedDialogStates = dialogStates as ExtendedDialogStates;
  const isTemplateManagerOpen = extendedDialogStates.templateManager || false;

  const showQuickOpenDialog = showQuickOpen;
  const currentLine = getCurrentLine();
  const totalLines = getTotalLines();

  // Wrapper for QuickOpen interface compatibility
  const handleQuickOpenFileNodeSelect = (file: FileNode) => {
    onQuickOpenFileSelect(file.path);
  };

  // Wrapper for dialog promise compatibility
  const handleDialogSaveAsync = async () => {
    onDialogSave();
  };

  // Open template manager handler
  const handleOpenTemplateManager = () => {
    updateDialogStates({ templateManager: true } as any);
  };

  // Close template manager handler
  const handleCloseTemplateManager = () => {
    updateDialogStates({ templateManager: false } as any);
  };

  // Footer panel handlers
  const handleToggleFooter = () => {
    updateEditorState({ showFooter: !showFooter });
  };

  const handleFooterPanelChange = (panel: 'terminal' | 'problems' | 'output' | 'debug' | null) => {
    updateEditorState({ activeFooterPanel: panel });
  };

  const handleFooterHeightChange = (height: number) => {
    updateEditorState({ footerHeight: height });
  };

  const handleToggleTerminal = () => {
    if (activeFooterPanel === 'terminal' && showFooter) {
      // If terminal is active and footer is visible, hide footer
      updateEditorState({ showFooter: false });
    } else {
      // Show footer and set terminal as active panel
      updateEditorState({ 
        showFooter: true, 
        activeFooterPanel: 'terminal' 
      });
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` (backtick) to toggle terminal like VS Code
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        handleToggleTerminal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFooterPanel, showFooter]);

  // Enhanced create new file handler with project type detection
  const handleEnhancedCreateNewFile = async (fileName: string, content?: string) => {
    // Construct the full file path properly
    const fullPath = currentDirectory ? `${currentDirectory}/${fileName}` : fileName;
    
    try {
      // Import file system service
      const { fileSystemService } = await import('../../services/fileSystemService');
      
      // Check if file already exists
      const files = await fileSystemService.loadFolderContents(currentDirectory || safeProject.rootPath, false);
      const fileExists = files.some(file => 
        !file.isDirectory && 
        file.name.toLowerCase() === fileName.toLowerCase()
      );
      
      if (fileExists) {
        throw new Error(`File '${fileName}' already exists. Please choose a different name.`);
      }
      
      // Create the file with content using the file saver directly
      await fileSaver.saveFile(fullPath, content || '');
      
      // Create FileInfo
      const fileInfo: FileInfo = {
        path: fullPath,
        name: fileName,
        extension: fileName.split('.').pop() || '',
        size: (content || '').length,
        lastModified: Date.now(),
        content: content || '',
      };
      
      // Open in tab with the content - openFileInTab will set isModified: false
      openFileInTab(fileInfo, content || '');
      
      // Clear file system cache for the directory to ensure new file shows up
      fileSystemService.clearFolderCache(currentDirectory || safeProject.rootPath);
      
      // Clear all caches and trigger refresh via ref to preserve expanded state
      fileSystemService.invalidateAllCaches();
      
      // Trigger immediate refresh via ref
      activeFileExplorerRefreshRef.current?.();
      
      // Additional cache clear and refresh with delay to ensure filesystem sync
      setTimeout(() => {
        fileSystemService.invalidateAllCaches();
        activeFileExplorerRefreshRef.current?.();
      }, 500);
      
      updateDialogStates({ newFile: false });
      console.log('✅ New file created:', fullPath);
      
    } catch (error) {
      console.error('❌ Failed to create new file:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to create file') 
      });
    }
  };

  // Enhanced create new folder handler
  const handleEnhancedCreateNewFolder = async (folderName: string) => {
    // Construct the full folder path
    const fullPath = currentDirectory ? `${currentDirectory}/${folderName}` : folderName;
    
    try {
      // Import and use the file system service
      const { fileSystemService } = await import('../../services/fileSystemService');
      
      // Check if folder already exists
      const items = await fileSystemService.loadFolderContents(currentDirectory || safeProject.rootPath, false);
      const folderExists = items.some(item => 
        item.isDirectory && 
        item.name.toLowerCase() === folderName.toLowerCase()
      );
      
      if (folderExists) {
        throw new Error(`Folder '${folderName}' already exists. Please choose a different name.`);
      }
      
      await fileSystemService.createDirectory(fullPath);
      
      // Clear cache for both current directory and parent directory
      fileSystemService.clearFolderCache(currentDirectory || safeProject.rootPath);
      if (currentDirectory) {
        const parentDir = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
        if (parentDir) {
          fileSystemService.clearFolderCache(parentDir);
        }
      }
      
      // Clear all caches and trigger refresh via ref to preserve expanded state
      fileSystemService.invalidateAllCaches();
      
      // Trigger immediate refresh via ref
      activeFileExplorerRefreshRef.current?.();
      
      // Additional cache clear and refresh with delay to ensure filesystem sync
      setTimeout(() => {
        fileSystemService.invalidateAllCaches();
        activeFileExplorerRefreshRef.current?.();
      }, 500);
      
      updateDialogStates({ newFolder: false });
      console.log('✅ New folder created:', fullPath);
      
    } catch (error) {
      console.error('❌ Failed to create new folder:', error);
      updateEditorState({ 
        currentError: error instanceof Error ? error : new Error('Failed to create folder') 
      });
    }
  };

  // Detect project type from package.json or other indicators
  const detectProjectType = (): string | undefined => {
    if (!safeProject.rootPath) return undefined;
    
    // Simple project type detection based on common patterns
    const rootPath = safeProject.rootPath.toLowerCase();
    
    if (rootPath.includes('react')) return 'react';
    if (rootPath.includes('next')) return 'next';
    if (rootPath.includes('vue')) return 'vue';
    if (rootPath.includes('angular')) return 'angular';
    if (rootPath.includes('web')) return 'web';
    
    return undefined;
  };

  return (
    <div className="h-full flex flex-col bg-vscode-editor relative overflow-hidden">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top section: Sidebar + Editor + Search Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer Sidebar */}
                     <div className={`
             ${showSidebar ? 'w-80' : 'w-0'} 
             transition-all duration-300 ease-in-out overflow-hidden
             border-r border-gray-700/40 bg-vscode-sidebar
             flex flex-col
           `}>
            {showSidebar && (
              <div className="h-full">
                {(() => {
                  const draftFiles = editorState.fileTabs
                    .filter(tab => tab.file.path.startsWith('<unsaved>/'))
                    .map(tab => ({
                      path: tab.file.path,
                      name: tab.file.name,
                      isModified: tab.isModified
                    }));
                  
                  // Draft files processed for FileExplorer
                  
                  return (
                    <FileExplorer
                      key={fileExplorerKey}
                      rootPath={safeProject.rootPath}
                      onFileSelect={onFileSelect}
                      height={600}
                      className="h-full transition-opacity duration-200"
                      selectedPath={activeTab?.file.path}
                      draftFiles={draftFiles}
                      refreshRef={activeFileExplorerRefreshRef}
                      onDirectoryToggle={(path: string, expanded: boolean) => {
                        // Track the current directory when users navigate
                        if (expanded) {
                          updateEditorState({ currentDirectory: path });
                        }
                      }}
                      onNewFile={() => {
                        updateDialogStates({ newFile: true });
                      }}
                      onNewFolder={() => updateDialogStates({ newFolder: true })}
                                              onRefresh={() => {
                          // Use the ref-based refresh to preserve expanded state
                          console.log('🔄 Manual refresh requested - using ref-based refresh');
                          activeFileExplorerRefreshRef.current?.();
                        }}
                      onCollapseAll={() => {
                        // This will be handled by the FileExplorer internally
                        console.log('🗂️ Collapsing all folders');
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-vscode-editor">
            {/* Unified Tab Bar - Only show when there are tabs */}
            {fileTabs.length > 0 && (
              <div className="flex items-center border-b border-gray-700/30 bg-vscode-tab-bg">
                <div className="flex-1">
                  <FileTabBar
                    tabs={fileTabs}
                    activeIndex={activeTabIndex}
                    onSelect={onTabSelect}
                    onClose={onTabClose}
                    onContextMenu={onTabContextMenu}
                    onTabMove={onTabMove}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragEnter={onDragEnter}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className="h-10"
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="px-3 flex items-center space-x-2">
                  <button
                    onClick={handleOpenTemplateManager}
                    className="
                      px-3 py-1.5 text-xs text-vscode-fg hover:bg-vscode-list-hover
                      border border-gray-600/40 rounded-md
                      focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:ring-opacity-50
                      transition-all duration-200 flex items-center gap-1.5
                    "
                    title="Manage File Templates"
                  >
                    <span>📋</span>
                    <span>Templates</span>
                  </button>
                  
                  <button
                    onClick={handleToggleTerminal}
                    className={`
                      px-3 py-1.5 text-xs border rounded-md
                      focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:ring-opacity-50
                      transition-all duration-200 flex items-center gap-1.5
                      ${showFooter && activeFooterPanel === 'terminal' 
                        ? 'bg-blue-600/80 text-white border-blue-500/50 shadow-sm' 
                        : 'text-vscode-fg hover:bg-vscode-list-hover border-gray-600/40'
                      }
                    `}
                    title={showFooter && activeFooterPanel === 'terminal' ? 'Hide Terminal (Ctrl+`)' : 'Show Terminal (Ctrl+`)'}
                  >
                    <span>🖥️</span>
                    <span>Terminal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Editor Content */}
            {activeTab ? (
              <div className="flex-1 relative overflow-hidden">
                <SimpleMonacoWrapper
                  selectedFile={activeTab.file as any}
                  fileContent={activeTab.content}
                  onContentChange={onContentChange}
                  onSave={onSave}
                  fontSize={14}
                  readOnly={false}
                />
                
                {/* Terminal Toggle Button - Floating */}
                <button
                  onClick={handleToggleTerminal}
                  className={`
                    absolute bottom-4 right-4 p-2 rounded-lg shadow-lg transition-all duration-200
                    ${showFooter && activeFooterPanel === 'terminal' 
                      ? 'bg-vscode-accent text-white' 
                      : 'bg-vscode-sidebar text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/50'
                    }
                    border border-gray-600/30 backdrop-blur-sm
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:ring-opacity-50
                  `}
                  title="Toggle Terminal (Ctrl+`)"
                >
                  <Terminal size={16} />
                </button>
              </div>
                         ) : (
               /* Modern Welcome Screen */
               <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-vscode-editor via-vscode-editor to-vscode-sidebar">
                <div className="text-center max-w-lg p-8">
                  <div className="mb-8">
                    <div className="text-8xl mb-4 text-vscode-accent opacity-80 animate-pulse">⚡</div>
                    <h1 className="text-3xl font-bold text-vscode-fg mb-2 gradient-text-blue">Syntari IDE</h1>
                    <p className="text-vscode-fg-muted text-lg">
                      Professional development environment
                    </p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <button
                      onClick={createNewFile}
                      className="
                        w-full px-6 py-4 bg-gradient-to-r from-vscode-accent to-blue-600 text-white rounded-lg
                        hover:from-blue-600 hover:to-blue-700 transition-all duration-300
                        focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:ring-opacity-50
                        transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl
                        flex items-center justify-center gap-3 font-medium
                      "
                    >
                      <span className="text-xl">📄</span>
                      <span>Create New File</span>
                    </button>
                    
                    <button
                      onClick={handleOpenFile}
                      className="
                        w-full px-6 py-4 border border-gray-600/50 text-vscode-fg rounded-lg
                        hover:border-blue-500/50 hover:bg-gray-700/30 transition-all duration-300
                        focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:ring-opacity-50
                        transform hover:scale-105 active:scale-95
                        flex items-center justify-center gap-3 font-medium
                      "
                    >
                      <span className="text-xl">📂</span>
                      <span>Open File</span>
                      <kbd className="ml-auto text-xs bg-vscode-sidebar px-2 py-1 rounded">Ctrl+O</kbd>
                    </button>
                  </div>
                  
                  <div className="text-vscode-fg-muted text-sm space-y-2">
                    <p>💡 <strong>Tip:</strong> Use <kbd className="bg-vscode-sidebar px-1 py-0.5 rounded text-xs">Ctrl+P</kbd> for quick file search</p>
                    <p>🖥️ <strong>Terminal:</strong> Press <kbd className="bg-vscode-sidebar px-1 py-0.5 rounded text-xs">Ctrl+`</kbd> to open terminal</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Panel */}
                     {showSearchPanel && (
             <div className="w-80 border-l border-gray-700/40 bg-vscode-sidebar flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-700/30">
                <h3 className="text-vscode-fg font-semibold text-sm mb-2">Search Results</h3>
                <SearchPanel
                  projectPath={safeProject.rootPath}
                  onNavigateToFile={(file: string, line?: number, column?: number) => {
                    onQuickOpenFileSelect(file);
                    if (line) {
                      setTimeout(() => {
                        onGoToLine(line, column);
                      }, 100);
                    }
                  }}
                  className="h-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Editor Footer with Terminal and other panels */}
        <EditorFooter
          projectPath={safeProject.rootPath}
          isVisible={showFooter}
          activePanel={activeFooterPanel}
          height={footerHeight}
          onToggleVisibility={handleToggleFooter}
          onPanelChange={handleFooterPanelChange}
          onHeightChange={handleFooterHeightChange}
          onAIRequest={onAskAI}
        />
      </div>

      {/* Dialogs */}
      {showQuickOpenDialog && (
        <div className="animate-fadeIn">
          <QuickOpen
            isOpen={showQuickOpen}
            projectPath={safeProject.rootPath}
            onClose={() => updateEditorState({ showQuickOpen: false })}
            onFileSelect={handleQuickOpenFileNodeSelect}
            recentFiles={recentFilePaths}
          />
        </div>
      )}

      {isOpenFileDialogOpen && (
        <div className="animate-fadeIn">
          <OpenFileDialog
            isOpen={isOpenFileDialogOpen}
            onClose={() => updateDialogStates({ openFile: false })}
            onOpenFile={async (filePath: string) => {
              onOpenFileFromDialog(filePath);
            }}
            projectRootPath={safeProject.rootPath}
            recentFiles={recentFilePaths}
          />
        </div>
      )}

      {isSaveAsDialogOpen && (
        <div className="animate-fadeIn">
          <SaveAsDialog
            isOpen={isSaveAsDialogOpen}
            onClose={() => updateDialogStates({ saveAs: false })}
            onSaveAs={async (filePath: string, fileName: string) => {
              onSaveAsFile(filePath, fileName);
            }}
            currentFileName={activeTab?.file.name || ''}
            currentPath={currentDirectory}
            projectRootPath={safeProject.rootPath}
          />
        </div>
      )}

      {isNewFileDialogOpen && (
        <div className="animate-fadeIn">
          <NewFileDialog
            isOpen={isNewFileDialogOpen}
            onClose={() => updateDialogStates({ newFile: false })}
            onCreateFile={handleEnhancedCreateNewFile}
            currentPath={currentDirectory}
            projectType={detectProjectType()}
          />
        </div>
      )}

      {isNewFolderDialogOpen && (
        <div className="animate-fadeIn">
          <NewFolderDialog
            isOpen={isNewFolderDialogOpen}
            onClose={() => updateDialogStates({ newFolder: false })}
            onCreateFolder={handleEnhancedCreateNewFolder}
            currentPath={currentDirectory}
          />
        </div>
      )}

      {/* Template Manager Dialog */}
      {isTemplateManagerOpen && (
        <div className="animate-fadeIn">
          <TemplateManagerDialog
            isOpen={isTemplateManagerOpen}
            onClose={handleCloseTemplateManager}
          />
        </div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="animate-fadeIn">
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => updateEditorState({ showCommandPalette: false })}
          />
        </div>
      )}

      {showGoToLine && (
        <div className="animate-fadeIn">
          <GoToLineDialog
            isOpen={showGoToLine}
            onClose={() => updateEditorState({ showGoToLine: false })}
            onGoToLine={onGoToLine}
            currentLineNumber={currentLine}
            totalLines={totalLines}
          />
        </div>
      )}

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedDialog.isOpen}
        fileName={unsavedDialog.fileName}
        onSave={handleDialogSaveAsync}
        onDontSave={onDialogDontSave}
        onCancel={onDialogCancel}
      />
    </div>
  );
}; 