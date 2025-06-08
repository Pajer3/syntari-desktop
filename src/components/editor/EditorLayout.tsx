import React from 'react';
import type { ProjectContext } from '../../types';
import type { FileNode } from '../../types/fileSystem';
import type { FileTab, EditorState, DialogStates } from './hooks/useEditorState';
import { VirtualizedFileExplorer } from './VirtualizedFileExplorer';
import { MonacoEditorWrapper } from './MonacoEditorWrapper';
import { FileTabBar } from './FileTabBar';
import { SearchPanel } from './search/SearchPanel';
import { TerminalPanel } from '../ui/TerminalPanel';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { GoToLineDialog } from './GoToLineDialog';
import { QuickOpen } from '../QuickOpen';
import { SaveAsDialog } from './dialogs/SaveAsDialog';
import { OpenFileDialog } from './dialogs/OpenFileDialog';
import { NewFileDialog } from './dialogs/NewFileDialog';
import { TemplateManagerDialog } from './dialogs/TemplateManagerDialog';
import { usePerformanceConfig } from './usePerformanceConfig';

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
  onCreateNewFile,
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
  // goToLineRef,       // Unused
  // getCurrentLineRef, // Unused
  // getTotalLinesRef,  // Unused
  // openFindRef,       // Unused
  // openFindReplaceRef, // Unused
  // goToSymbolRef,     // Unused
  monacoEditorRef,
}) => {
  const performanceConfig = usePerformanceConfig();
  
  const {
    fileTabs,
    activeTabIndex,
    showSearchPanel,
    showQuickOpen,
    // draggedTabIndex,   // Unused
    // dragOverIndex,     // Unused
    showGoToLine,
    showSidebar,
    currentDirectory,
    fileExplorerKey,
    isLoading,
  } = editorState;

  // Terminal panel state (using local state for now)
  const [showTerminal, setShowTerminal] = React.useState(false);

  const {
    saveAs: isSaveAsDialogOpen,
    openFile: isOpenFileDialogOpen,
    newFile: isNewFileDialogOpen,
    unsavedChanges: unsavedDialog,
  } = dialogStates;

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

  // Navigate to file from search results
  const handleNavigateToFile = (
    file: string,
    line?: number,
    column?: number,
  ) => {
    onQuickOpenFileSelect(file);
    setTimeout(() => {
      onGoToLine(line ?? 0, column);
    }, 100);
  };

  // Enhanced create new file handler with project type detection
  const handleEnhancedCreateNewFile = async (fileName: string, _content?: string) => {
    await onCreateNewFile(currentDirectory, fileName);
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
                <VirtualizedFileExplorer
                  key={fileExplorerKey}
                  rootPath={safeProject.rootPath}
                  onFileSelect={onFileSelect}
                  height={600}
                  className="h-full transition-opacity duration-200"
                  selectedPath={activeTab?.file.path}
                  onDirectoryToggle={(path: string, expanded: boolean) => {
                    // Track the current directory when users navigate
                    if (expanded) {
                      updateEditorState({ currentDirectory: path });
                    }
                  }}
                />
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
                    onClick={() => setShowTerminal(!showTerminal)}
                    className={`
                      px-3 py-1.5 text-xs border rounded-md
                      focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:ring-opacity-50
                      transition-all duration-200 flex items-center gap-1.5
                      ${showTerminal 
                        ? 'bg-blue-600/80 text-white border-blue-500/50 shadow-sm' 
                        : 'text-vscode-fg hover:bg-vscode-list-hover border-gray-600/40'
                      }
                    `}
                    title={showTerminal ? 'Hide Terminal (Ctrl+`)' : 'Show Terminal (Ctrl+`)'}
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
                <MonacoEditorWrapper
                  selectedFile={activeTab.file as any}
                  fileContent={activeTab.content}
                  perfConfig={performanceConfig.perfConfig}
                  performanceMode={performanceConfig.performanceMode}
                  onContentChange={onContentChange}
                  onSave={onSave}
                  onAskAI={() => onAskAI({})}
                  isLoading={isLoading}
                  theme="vs-dark"
                  fontSize={14}
                  minimap={!performanceConfig.performanceMode}
                  ref={monacoEditorRef}
                />
                
                {/* Modern Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-vscode-editor bg-opacity-95 flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <div className="animate-spin w-10 h-10 border-3 border-vscode-accent border-t-transparent rounded-full mx-auto"></div>
                        <div className="absolute inset-0 w-10 h-10 border-3 border-vscode-accent border-opacity-20 rounded-full mx-auto"></div>
                      </div>
                      <div className="text-vscode-fg font-medium">Loading file...</div>
                      <div className="text-vscode-fg-muted text-sm mt-1">Please wait</div>
                    </div>
                  </div>
                )}
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
                  
                  <div className="text-vscode-fg-muted text-sm">
                    <p>💡 <strong>Tip:</strong> Use <kbd className="bg-vscode-sidebar px-1 py-0.5 rounded text-xs">Ctrl+P</kbd> for quick file search</p>
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
                  onNavigateToFile={handleNavigateToFile}
                  className="h-full"
                />
              </div>
            </div>
          )}
        </div>

                 {/* Terminal Panel */}
         {showTerminal && (
           <div className="border-t border-gray-700/40">
            <TerminalPanel
              projectPath={safeProject.rootPath}
              isVisible={showTerminal}
              onToggleVisibility={() => setShowTerminal(false)}
              height={300}
              className="bg-vscode-sidebar"
            />
          </div>
        )}
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

      {/* Template Manager Dialog */}
      {isTemplateManagerOpen && (
        <div className="animate-fadeIn">
          <TemplateManagerDialog
            isOpen={isTemplateManagerOpen}
            onClose={handleCloseTemplateManager}
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