// Syntari AI IDE - Main Application (MVVM View Layer)
// Enterprise AI router desktop application with multi-model consensus

import React, { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppViewModel } from './hooks/useAppViewModel';
import { useChatViewModel } from './hooks/useChatViewModel';
import { useGlobalKeyboardShortcuts, useShortcut } from './hooks/useKeyboardShortcuts';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
import { TabLayout, useTabManager, type Tab } from './components/TabLayout';
import { CodeEditor } from './components/CodeEditor';
import { ProjectAIAssistant } from './components/ProjectAIAssistant';
import { LoadingScreen, ErrorScreen, PermissionRequestDialog } from './components/ui';
import { ChatView } from './components/chat';
import { SettingsView } from './components/layout';


import type { FileInfo } from './types';
import './App.css';
import { configureMonaco } from './config/monaco.config';

// ================================
// MAIN APPLICATION COMPONENT
// ================================

const App: React.FC = () => {
  // ================================
  // VIEW MODEL INTEGRATION
  // ================================
  
  const appViewModel = useAppViewModel();
  const chatViewModel = useChatViewModel(
    appViewModel.viewModel.project,
    appViewModel.handleError
  );
  
  // ================================
  // GLOBAL KEYBOARD SHORTCUTS
  // ================================
  
  // Initialize global keyboard shortcuts system
  useGlobalKeyboardShortcuts();
  
  // ================================
  // TAB MANAGEMENT & UI STATE
  // ================================
  
  const tabManager = useTabManager();
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);
  
  // Cool UI state for animations
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showStartupAnimation, setShowStartupAnimation] = useState(true);

  // ================================
  // TERMINAL STATE
  // ================================
  


  // ================================
  // HANDLER FUNCTIONS (declare before use)
  // ================================

  const handleSettings = () => {
    appViewModel.setCurrentView('settings');
  };





  // ================================
  // STARTUP ANIMATION
  // ================================
  
  useEffect(() => {
    // Initialize Monaco for instant startup
    configureMonaco();
    
    // Quick app startup - reduced animation time
    const timer = setTimeout(() => {
      setIsAppLoaded(true);
      // Much faster startup
      setTimeout(() => setShowStartupAnimation(false), 200);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // ================================
  // FOLDER PICKER & PROJECT MANAGEMENT
  // ================================
  
  const handleOpenProject = useCallback(async () => {
    try {
      // Use Tauri's native folder dialog
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
        defaultPath: undefined, // Let the OS decide the default location
      });
      
      if (selectedPath && typeof selectedPath === 'string') {
        // Store the selected path and show permission dialog
        setPendingProjectPath(selectedPath);
        setShowPermissionDialog(true);
      }
      // User cancelled or invalid path - no action needed
    } catch (error) {
      console.error('Error opening project folder:', error);
      
      // Provide more specific error handling
      let errorMessage = 'Failed to open folder picker. Please try again.';
      let errorCode = 'DIALOG_FAILED';
      
      if (error instanceof Error) {
        if (error.message.includes('dialog')) {
          errorMessage = 'File dialog failed to open. Please ensure the application has necessary permissions.';
          errorCode = 'DIALOG_FAILED';
        }
      }
      
      appViewModel.handleError({
        code: errorCode,
        message: errorMessage,
        severity: 'error',
        timestamp: Date.now(),
        recoverable: true,
      });
    }
  }, []);
  
  const createProjectTabs = useCallback(async (project: any) => {
    try {
      // Clear existing tabs
      tabManager.tabs.forEach(tab => tabManager.removeTab(tab.id));
      
      // Get project name from path
      const projectName = project.rootPath.split('/').pop() || project.rootPath.split('\\').pop() || 'Project';
      
      // Create Editor Tab
      const editorTab: Tab = {
        id: 'editor',
        title: `${projectName} - Files`,
        icon: '📝',
        closeable: false,
        content: (
          <CodeEditor
            project={project}
            onFileChange={(file: FileInfo | null) => {
              if (file) {
                setCurrentFile(file);
              }
            }}
            onRequestAI={handleAIRequest}
          />
        ),
      };
      
      // Create AI Assistant Tab
      const aiAssistantTab: Tab = {
        id: 'ai-assistant',
        title: 'AI Assistant',
        icon: '🤖',
        closeable: false,
        content: (
          <ProjectAIAssistant
            project={project}
            currentFile={currentFile}
          />
        ),
      };
      
      // Add tabs in order
      tabManager.addTab(editorTab);
      tabManager.addTab(aiAssistantTab);
      
      // Set the first tab as active
      tabManager.switchToTab('editor');
      
      // Switch app to tabbed view
      appViewModel.setCurrentView('editor');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to create project tabs:', error);
      
      // Show error but don't fail completely
      appViewModel.handleError({
        code: 'TAB_CREATION_FAILED',
        message: 'Failed to create project tabs. Some features may not work correctly.',
        severity: 'warning',
        timestamp: Date.now(),
        recoverable: true,
      });
      
      // At least switch to editor view
      appViewModel.setCurrentView('editor');
      
      return false;
    }
  }, [tabManager, appViewModel, currentFile, handleOpenProject, handleSettings]);

  // Handle AI requests from components
  const handleAIRequest = useCallback((context: any) => {
    if (appViewModel.viewModel.currentView === 'editor') {
      // Switch to AI chat tab
      tabManager.switchToTab('ai-assistant');
    } 
    // Log context for potential future use
    console.log('AI request context:', context);
    return false;
  }, [tabManager, appViewModel.viewModel.currentView]);

  const handlePermissionConfirm = useCallback(async () => {
    if (!pendingProjectPath) return;
    
    try {
      // Check if we have permissions to access this folder
      const permissionCheck = await invoke<any>('check_folder_permissions', {
        path: pendingProjectPath,
      });
      
      if (!permissionCheck.success || !permissionCheck.data) {
        // Show user-friendly permission error
        appViewModel.handleError({
          code: 'PERMISSION_DENIED',
          message: permissionCheck.error || 'Cannot access the selected folder. Please choose a folder you have read permissions for, or run the application as administrator.',
          severity: 'error',
          timestamp: Date.now(),
          recoverable: true,
        });
        setShowPermissionDialog(false);
        setPendingProjectPath(null);
        return;
      }
      
      // Call the backend directly to get project data
      const projectResult = await invoke<any>('open_project', {
        path: pendingProjectPath,
      });
      
      if (!projectResult.success || !projectResult.data) {
        throw new Error(projectResult.error || 'Failed to load project data');
      }
      
      // Convert backend project data to frontend format
      const project = {
        rootPath: projectResult.data.root_path,
        projectType: projectResult.data.project_type,
        openFiles: projectResult.data.open_files.map((file: any) => ({
          path: file.path,
          name: file.name,
          extension: file.extension,
          size: file.size,
          lastModified: file.last_modified,
          content: file.content,
          language: file.language,
        })),
        dependencies: projectResult.data.dependencies,
        gitBranch: projectResult.data.git_branch,
        activeFramework: projectResult.data.active_framework,
        lastAnalyzed: Date.now(),
      };
      
      // Create project tabs immediately with the project data we have
      await createProjectTabs(project);
      
      // Also update the view model state (this might be async)
      appViewModel.openProject(pendingProjectPath);
      
      setShowPermissionDialog(false);
      setPendingProjectPath(null);
    } catch (error) {
      console.error('Error verifying permissions or opening project:', error);
      
      // Provide more specific error handling
      let errorMessage = 'Failed to open project. Please try again.';
      let errorCode = 'PROJECT_OPEN_FAILED';
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please run as administrator or choose a different folder.';
          errorCode = 'PERMISSION_DENIED';
        } else if (error.message.includes('invoke')) {
          errorMessage = 'Backend communication failed. Please restart the application.';
          errorCode = 'BACKEND_ERROR';
        } else if (error.message.includes('project data')) {
          errorMessage = 'Failed to analyze project structure. Please ensure the folder contains valid project files.';
          errorCode = 'PROJECT_ANALYSIS_FAILED';
        }
      }
      
      appViewModel.handleError({
        code: errorCode,
        message: errorMessage,
        severity: 'error',
        timestamp: Date.now(),
        recoverable: true,
      });
      
      setShowPermissionDialog(false);
      setPendingProjectPath(null);
    }
  }, [pendingProjectPath, appViewModel, createProjectTabs]);
  
  const handlePermissionCancel = useCallback(() => {
    setShowPermissionDialog(false);
    setPendingProjectPath(null);
  }, []);

  // ================================
  // CONTEXT MENU HANDLERS
  // ================================
  
  // DISABLED: Custom context menu items  
  // const getContextMenuItems = () => {
  //   return getDefaultContextMenuItems(
  //     currentView,
  //     currentPath || '',
  //     currentModelProvider,
  //     chatSessions.length
  //   );
  // };

  // ================================
  // KEYBOARD SHORTCUTS
  // ================================
  
  // Configuration-based keyboard shortcuts
  useShortcut('fileManagement', 'openFile', () => {
    handleOpenProject();
    return true;
  }, [handleOpenProject]);

  useShortcut('views', 'toggleSettings', () => {
    handleSettings();
    return true;
  }, [handleSettings]);

  useShortcut('ai', 'switchToAI', () => {
    if (appViewModel.viewModel.currentView === 'editor') {
      tabManager.switchToTab('ai-assistant');
      return true;
    }
    return false;
  }, [appViewModel.viewModel.currentView, tabManager]);



  // ================================
  // RENDER LOGIC
  // ================================
  
  console.log('🔍 App render - isLoading:', appViewModel.viewModel.isLoading, 'currentView:', appViewModel.viewModel.currentView, 'error:', !!appViewModel.viewModel.error);
  
  if (appViewModel.viewModel.isLoading) {
    console.log('📺 Showing LoadingScreen because isLoading is true');
    return <LoadingScreen />;
  }
  
  if (appViewModel.viewModel.error) {
    console.log('📺 Showing ErrorScreen because error exists:', appViewModel.viewModel.error);
    return (
      <ErrorScreen 
        error={appViewModel.viewModel.error} 
        onRetry={appViewModel.clearError}
      />
    );
  }

  console.log('📺 Showing main app content');

  return (
    <div 
      className={`
        h-screen bg-gradient-to-br from-vscode-editor via-vscode-editor to-vscode-sidebar
        text-white flex flex-col overflow-hidden relative
        transition-all duration-500 ease-out
        ${isAppLoaded ? 'opacity-100' : 'opacity-0'}
      `}

    >
      {/* Cool startup animation overlay */}
      {showStartupAnimation && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-vscode-accent/20 to-purple-600/20 backdrop-blur-sm flex items-center justify-center animate-fadeOut">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-vscode-accent/30 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-vscode-accent border-r-vscode-accent rounded-full animate-spin"></div>
              <div className="absolute inset-3 border-2 border-transparent border-t-blue-400 border-r-blue-400 rounded-full animate-spin animation-delay-300"></div>
              <div className="absolute inset-6 w-8 h-8 bg-gradient-to-r from-vscode-accent to-blue-400 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gradient animate-typing">Syntari AI IDE</h1>
            <p className="text-vscode-fg-muted animate-fadeIn animation-delay-500">
              Initializing the future of coding...
            </p>
          </div>
        </div>
      )}

      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-vscode-accent/10 to-transparent animate-shimmer"></div>
      </div>

      {/* Enhanced Interactive Header with smooth entrance */}
      <div className={`
        transition-all duration-700 ease-out
        ${isAppLoaded ? 'transform translate-y-0 opacity-100' : 'transform -translate-y-full opacity-0'}
      `}>
        <Header 
          viewModel={appViewModel.viewModel}
          aiProviders={[]}
          onSettings={handleSettings}
          onTogglePerformanceMode={appViewModel.togglePerformanceMode}
          onOpenProject={handleOpenProject}
          onNewFile={() => {
            // Open new file dialog
            window.dispatchEvent(new CustomEvent('open-new-file-dialog'));
          }}
          onSaveFile={() => {
            // Save current active file
            const activeTab = tabManager.tabs.find(tab => tab.id === tabManager.activeTabId);
            if (activeTab && activeTab.filePath) {
              window.dispatchEvent(new CustomEvent('save-file', {
                detail: { filePath: activeTab.filePath }
              }));
            }
          }}
          onUndo={() => {
            // Trigger undo in active editor
            window.dispatchEvent(new CustomEvent('editor-undo'));
          }}
          onRedo={() => {
            // Trigger redo in active editor
            window.dispatchEvent(new CustomEvent('editor-redo'));
          }}
          onFind={() => {
            // Open find dialog in active editor
            window.dispatchEvent(new CustomEvent('editor-find'));
          }}
          onCommandPalette={() => {
            // Open command palette
            window.dispatchEvent(new CustomEvent('open-command-palette'));
          }}
          onHelp={() => {
            // Open help dialog
            window.dispatchEvent(new CustomEvent('open-help-dialog'));
          }}
        />
      </div>
      
      {/* Main Content with smooth slide-in animation */}
      <div className={`
        flex-1 relative
        transition-all duration-700 ease-out animation-delay-300
        ${isAppLoaded ? 'transform translate-y-0 opacity-100' : 'transform translate-y-8 opacity-0'}
        ${appViewModel.viewModel.currentView === 'welcome' ? 'overflow-y-auto' : 'overflow-hidden'}
      `}>
        {(() => {
          switch (appViewModel.viewModel.currentView) {
            case 'welcome':
              return (
                <div className="animate-scaleIn">
                  <WelcomeScreen 
                    onOpenProject={handleOpenProject}
                  />
                </div>
              );
              
            case 'editor':
              // Always show TabLayout when tabs exist, regardless of active tab
              if (tabManager.tabs.length > 0) {
                return (
                  <div className="h-full animate-fadeIn">
                    <TabLayout
                      tabs={tabManager.tabs}
                      activeTabId={tabManager.activeTabId}
                      onTabChange={tabManager.switchToTab}
                      onTabClose={tabManager.removeTab}
                      onTabReorder={tabManager.reorderTabs}
                      className="h-full"
                    />
                  </div>
                );
              }
              // Fallback when no project is loaded
              return (
                <div className="h-full bg-gradient-to-br from-vscode-editor to-vscode-sidebar text-white flex items-center justify-center animate-scaleIn">
                  <div className="text-center max-w-md p-8 glass rounded-2xl shadow-lift">
                    <div className="text-6xl mb-6 animate-bounce">📝</div>
                    <h2 className="text-2xl font-semibold mb-4 text-white">Code Editor</h2>
                    <p className="text-vscode-fg mb-6">No project loaded</p>
                    <div className="text-xs text-vscode-fg mb-6 space-y-1 bg-vscode-sidebar/50 p-3 rounded-lg border border-gray-600/30">
                      <div>Project in viewModel: {appViewModel.viewModel.project ? '✅ Yes' : '❌ No'}</div>
                      <div>Active tabs: {tabManager.tabs.length}</div>
                      <div>Tab IDs: {tabManager.tabs.map(t => t.id).join(', ') || 'None'}</div>
                    </div>
                    <button
                      onClick={handleOpenProject}
                      className="px-8 py-3 gradient-accent hover:shadow-glow rounded-xl transition-all duration-300 font-medium btn-hover-lift focus-ring"
                    >
                      🚀 Open Project
                    </button>
                  </div>
                </div>
              );
              
            case 'chat':
              return (
                <div className="animate-slideIn">
                  <ChatView chatViewModel={chatViewModel} />
                </div>
              );
              
            case 'settings':
              return (
                <div className="animate-fadeIn">
                  <SettingsView />
                </div>
              );
              
            default:
              return (
                <div className="animate-scaleIn">
                  <WelcomeScreen 
                    onOpenProject={handleOpenProject}
                  />
                </div>
              );
          }
        })()}
      </div>



      {/* Context Menu */}
      {/* DISABLED: Custom context menu */}
      {/* 
      <ContextMenu
        visible={contextMenu.contextMenu.visible}
        x={contextMenu.contextMenu.x}
        y={contextMenu.contextMenu.y}
        items={getContextMenuItems()}
        onClose={() => contextMenu.hideContextMenu('user_dismissed')}
      />
      */}

      {/* Permission Dialog with smooth animation */}
      {showPermissionDialog && (
        <div className="animate-scaleIn">
          <PermissionRequestDialog
            isOpen={showPermissionDialog}
            onConfirm={handlePermissionConfirm}
            onCancel={handlePermissionCancel}
          />
        </div>
      )}
    </div>
  );
};

export default App;
