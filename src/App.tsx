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
    
    // Very fast app startup - minimal animation time
    const timer = setTimeout(() => {
      setIsAppLoaded(true);
      // Extremely fast startup - welcome screen shows almost immediately
      setTimeout(() => setShowStartupAnimation(false), 100);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ================================
  // APP INITIALIZATION
  // ================================
  
  useEffect(() => {
    // Initialize the app view model
    const initApp = async () => {
      try {
        await appViewModel.initializeApp();
        console.log('✅ App initialization completed');
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        appViewModel.handleError({
          code: 'APP_INIT_FAILED',
          message: 'Failed to initialize application',
          severity: 'critical',
          timestamp: Date.now(),
          recoverable: true,
        });
      }
    };

    initApp();
  }, [appViewModel]);

  // ================================
  // DEBUG: Log current state for troubleshooting
  // ================================
  
  useEffect(() => {
    console.log('🔍 App State Debug:', {
      currentView: appViewModel.viewModel.currentView,
      isLoading: appViewModel.viewModel.isLoading,
      hasError: !!appViewModel.viewModel.error,
      hasProject: !!appViewModel.viewModel.project,
      isAppLoaded,
      showStartupAnimation
    });
  }, [
    appViewModel.viewModel.currentView,
    appViewModel.viewModel.isLoading,
    appViewModel.viewModel.error,
    appViewModel.viewModel.project,
    isAppLoaded,
    showStartupAnimation
  ]);

  // ================================
  // FOLDER PICKER & PROJECT MANAGEMENT
  // ================================
  
  const handleOpenProject = useCallback(async () => {
    try {
      let selectedPath: string | null = null;

      // Check if we're running in Tauri (desktop) vs web browser
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      
      if (isTauri) {
        // Use Tauri's native folder dialog for desktop app
        console.log('🖥️ Running in Tauri - using native folder picker');
        const result = await open({
          directory: true,
          multiple: false,
          title: 'Select Project Folder',
          defaultPath: undefined,
        });
        
        if (result && typeof result === 'string') {
          selectedPath = result;
        }
      } else {
        // Use Web File System Access API for web browser
        console.log('🌐 Running in web browser - using File System Access API');
        
        // Enhanced browser compatibility check
        const hasFileSystemAPI = 'showDirectoryPicker' in window && typeof (window as any).showDirectoryPicker === 'function';
        const isSecureContext = window.isSecureContext;
        const userAgent = navigator.userAgent.toLowerCase();
        const isBrave = (navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function';
        
        console.log('🔍 Browser compatibility check:', {
          hasFileSystemAPI,
          isSecureContext,
          userAgent: userAgent.includes('chrome') ? 'chrome-based' : 'other',
          isBrave: isBrave || userAgent.includes('brave')
        });
        
        if (!isSecureContext) {
          throw new Error('File System Access API requires a secure context (HTTPS). Please use HTTPS or try the desktop version.');
        }
        
        if (!hasFileSystemAPI) {
          throw new Error('Your browser does not support the File System Access API. Please use Chrome 86+, Edge 86+, or try the desktop version of Syntari AI.');
        }
        
        try {
          // For Brave browser, we need to be more explicit about permissions
          const pickerOptions: any = {
            mode: 'readwrite' as const,
            startIn: 'documents' as const
          };
          
          // Brave might need additional handling
          if (isBrave || userAgent.includes('brave')) {
            console.log('🦁 Brave browser detection - using enhanced picker options');
            // Brave requires explicit user gesture and may have additional restrictions
            pickerOptions.multiple = false;
            pickerOptions.excludeAcceptAllOption = false;
          }
          
          const dirHandle = await (window as any).showDirectoryPicker(pickerOptions);
          
          // Verify the directory handle is valid
          if (!dirHandle || typeof dirHandle.name !== 'string') {
            throw new Error('Invalid directory handle received from browser');
          }
          
          // Get the directory path from the handle
          selectedPath = dirHandle.name;
          
          // Store the directory handle in the file system service
          const { fileSystemService } = await import('./services/fileSystemService');
          if (fileSystemService.webCompat && fileSystemService.webCompat.setDirectoryHandle) {
            fileSystemService.webCompat.setDirectoryHandle(dirHandle);
            console.log('✅ Directory handle stored successfully');
          } else {
            console.error('❌ WebFileSystemCompat not available');
            throw new Error('File system compatibility layer not available. Please refresh the page and try again.');
          }
          
          console.log('📁 Selected directory:', selectedPath);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            // User cancelled the picker
            console.log('📁 Folder picker cancelled by user');
            return;
          }
          
          // More specific error handling for different browser issues
          if (error.name === 'NotAllowedError') {
            throw new Error('Permission denied by browser. Please allow file system access or try the desktop version.');
          } else if (error.name === 'SecurityError') {
            throw new Error('Security restrictions prevent folder access. Please use HTTPS or try the desktop version.');
          } else if (error.message.includes('not supported')) {
            throw new Error('Your browser version does not support the File System Access API. Please update your browser or try the desktop version.');
          }
          
          throw error;
        }
      }
      
      if (selectedPath) {
        // Store the selected path and show permission dialog
        setPendingProjectPath(selectedPath);
        setShowPermissionDialog(true);
      }
      
    } catch (error) {
      console.error('Error opening project folder:', error);
      
      // Provide more specific error handling
      let errorMessage = 'Failed to open folder picker. Please try again.';
      let errorCode = 'DIALOG_FAILED';
      
      if (error instanceof Error) {
        if (error.message.includes('not support')) {
          errorMessage = error.message;
          errorCode = 'BROWSER_NOT_SUPPORTED';
        } else if (error.message.includes('dialog')) {
          errorMessage = 'File dialog failed to open. Please ensure the application has necessary permissions.';
          errorCode = 'DIALOG_FAILED';
        } else if (error.message.includes('Permission')) {
          errorMessage = 'Permission denied. Please grant folder access permission.';
          errorCode = 'PERMISSION_DENIED';
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
      // Check if we're running in Tauri (desktop) vs web browser
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      
      if (isTauri) {
        // Desktop app - use Tauri backend
        console.log('🖥️ Using Tauri backend for project loading');
        
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
      } else {
        // Web browser - use File System Access API
        console.log('🌐 Using web browser file system for project loading');
        
        // Create a basic project structure for web
        const project = {
          rootPath: pendingProjectPath,
          projectType: 'web',
          openFiles: [],
          dependencies: [],
          gitBranch: 'main',
          activeFramework: 'unknown',
          lastAnalyzed: Date.now(),
        };
        
        // Create project tabs with the minimal project data
        await createProjectTabs(project);
        
        // Update the view model state  
        appViewModel.openProject(pendingProjectPath);
        
        console.log('✅ Web project loaded successfully');
      }
      
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
        } else if (error.message.includes('File system compatibility')) {
          errorMessage = 'Browser compatibility issue. Please refresh the page and try again.';
          errorCode = 'BROWSER_COMPATIBILITY_ERROR';
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

  // System tab switching handler (extracted for use in both useShortcut and event listener)
  const handleSwitchSystemTabs = useCallback(() => {
    console.log('🔄 System tab switching requested');
    
    if (appViewModel.viewModel.currentView === 'editor') {
      // Get current active tab and switch to the next system tab
      const currentTabId = tabManager.activeTabId;
      console.log('🔄 Current active tab:', currentTabId);
      
      // Get all system tabs (non-closeable tabs)
      const systemTabs = tabManager.tabs.filter(tab => !tab.closeable);
      console.log('🔄 Available system tabs:', systemTabs.map(t => t.id));
      
      if (systemTabs.length <= 1) {
        console.log('🔄 Only one or no system tabs available, cannot switch');
        return;
      }
      
      // Find current tab index in system tabs
      const currentIndex = systemTabs.findIndex(tab => tab.id === currentTabId);
      
      if (currentIndex === -1) {
        // Current tab is not a system tab, switch to first system tab
        tabManager.switchToTab(systemTabs[0].id);
        console.log('🔄 ✅ Switched to first system tab:', systemTabs[0].id);
      } else {
        // Switch to next system tab (wrap around)
        const nextIndex = (currentIndex + 1) % systemTabs.length;
        const nextTab = systemTabs[nextIndex];
        tabManager.switchToTab(nextTab.id);
        console.log('🔄 ✅ Switched to next system tab:', nextTab.id);
      }
    }
  }, [appViewModel.viewModel.currentView, tabManager]);

  // System tab switching (Ctrl+Shift+Tab) - ensures it works through useShortcut system
  useShortcut('tabManagement', 'switchSystemTabs', () => {
    console.log('🔄 System tab switching via useShortcut system');
    handleSwitchSystemTabs();
    return true; // Indicate the shortcut was handled
  }, [handleSwitchSystemTabs]);

  // F2 - Rename Symbol (VS Code style)
  useShortcut('navigation', 'renameSymbol', () => {
    console.log('🔑 F2 - Rename Symbol via useShortcut system');
    window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'rename-symbol' } }));
    return true; // Indicate the shortcut was handled
  }, []);

  // F12 - Go to Definition (VS Code style)
  useShortcut('navigation', 'goToDefinition', () => {
    console.log('🔑 F12 - Go to Definition via useShortcut system');
    window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'go-to-definition' } }));
    return true; // Indicate the shortcut was handled
  }, []);

  // System tab switching handler (Ctrl+Shift+Tab) - fallback event listener
  useEffect(() => {

    window.addEventListener('syntari:switchSystemTabs', handleSwitchSystemTabs);
    
    return () => {
      window.removeEventListener('syntari:switchSystemTabs', handleSwitchSystemTabs);
    };
  }, [appViewModel.viewModel.currentView, tabManager]);



  // ================================
  // RENDER LOGIC
  // ================================
  
  console.log('🔍 App render - isLoading:', appViewModel.viewModel.isLoading, 'currentView:', appViewModel.viewModel.currentView, 'error:', !!appViewModel.viewModel.error);
  
  // Show loading screen only during initial startup animation
  if (showStartupAnimation) {
    console.log('📺 Showing startup animation');
    return (
      <LoadingScreen 
        message="Initializing Syntari AI IDE..." 
        submessage="Welcome to the future of coding..."
      />
    );
  }

  // Show error screen only for critical errors that prevent app usage
  if (appViewModel.viewModel.error && appViewModel.viewModel.error.severity === 'critical') {
    console.log('📺 Showing error screen');
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
          const currentView = appViewModel.viewModel.currentView;
          console.log('🎯 Rendering view:', currentView, 'with project:', !!appViewModel.viewModel.project);
          
          switch (currentView) {
            case 'welcome':
              console.log('📋 Showing WelcomeScreen component');
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
                console.log('📝 Showing TabLayout with', tabManager.tabs.length, 'tabs');
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
              console.log('📝 Showing editor fallback - no tabs');
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
              console.log('💬 Showing ChatView component');
              return (
                <div className="animate-slideIn">
                  <ChatView chatViewModel={chatViewModel} />
                </div>
              );
              
            case 'settings':
              console.log('⚙️ Showing SettingsView component');
              return (
                <div className="animate-fadeIn">
                  <SettingsView />
                </div>
              );
              
            default:
              console.log('🏠 Defaulting to WelcomeScreen for unknown view:', currentView);
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
