// Syntari AI IDE - Main Application (MVVM View Layer)
// Enterprise AI router desktop application with multi-model consensus

import React, { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppViewModel } from './hooks/useAppViewModel';
import { useChatViewModel } from './hooks/useChatViewModel';
import { useContextMenu } from './hooks/useContextMenu';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ContextMenu, getDefaultContextMenuItems } from './components/ContextMenu';
import { TabLayout, useTabManager, type Tab } from './components/TabLayout';
import { CodeEditor } from './components/CodeEditor';
import { ProjectAIAssistant } from './components/ProjectAIAssistant';
import type { FileInfo, ChatMessage } from './types';
import './App.css';

// ================================
// VIEW COMPONENTS
// ================================

const PermissionRequestDialog: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">File System Access</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Syntari AI IDE needs permission to read your project folder to analyze 
            your code structure, dependencies, and provide intelligent assistance.
          </p>
        </div>
        
        <div className="space-y-3 mb-6 text-sm text-gray-300">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Read project files and folders</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Analyze code structure and dependencies</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Provide context-aware AI assistance</span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Allow Access
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gray-900 text-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
      <h2 className="text-xl font-semibold mb-2">Initializing Syntari AI IDE</h2>
      <p className="text-gray-400">Loading AI providers and enterprise features...</p>
    </div>
  </div>
);

const ErrorScreen: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="flex items-center justify-center h-full bg-gray-900 text-white">
    <div className="text-center max-w-md">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold mb-2 text-red-400">Application Error</h2>
      <p className="text-gray-400 mb-4">{error.message}</p>
      <p className="text-sm text-gray-500 mb-6">Code: {error.code}</p>
      {error.recoverable && (
        <button 
          onClick={onRetry}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Retry Initialization
        </button>
      )}
    </div>
  </div>
);

const ChatView: React.FC<{ 
  chatViewModel: ReturnType<typeof useChatViewModel>;
}> = ({ chatViewModel }) => {
  const { viewModel, sendMessage, setInput, toggleSmartRouting } = chatViewModel;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewModel.input.trim()) {
      sendMessage(viewModel.input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">{viewModel.session.name}</h1>
          <span className="text-sm text-gray-400">
            {viewModel.session.context.projectType} project
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-400">
            💰 ${chatViewModel.totalCost.toFixed(6)} spent
          </span>
          <button 
            onClick={toggleSmartRouting}
            className={`px-3 py-1 rounded text-xs ${
              viewModel.smartRouting 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            🧠 Smart Routing: {viewModel.smartRouting ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 ide-scrollbar">
        {viewModel.session.messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <div className="text-4xl mb-4">💬</div>
            <p>Start a conversation with your AI assistant</p>
            <p className="text-sm mt-2">Project: {viewModel.session.context.projectType}</p>
          </div>
        ) : (
          viewModel.session.messages.map((message: ChatMessage, index: number) => (
            <div 
              key={message.id || index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-100'
              }`}>
                <p className="text-sm">{message.content}</p>
                {message.metadata?.provider && (
                  <p className="text-xs mt-1 opacity-70">
                    via {message.metadata.provider} • ${message.metadata.cost?.toFixed(6) || '0.000000'}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        
        {viewModel.isTyping && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 bg-gray-700 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/30">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={viewModel.input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your project..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            disabled={viewModel.isTyping}
          />
          <button
            type="submit"
            disabled={!chatViewModel.canSendMessage}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

const SettingsView: React.FC = () => (
  <div className="h-full bg-gray-900 text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">⚙️</div>
      <h2 className="text-2xl font-semibold mb-2">Settings</h2>
      <p className="text-gray-400">Configure your AI IDE preferences</p>
    </div>
  </div>
);

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
  const contextMenu = useContextMenu();
  
  // ================================
  // TAB MANAGEMENT
  // ================================
  
  const tabManager = useTabManager();
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);

  // ================================
  // FOLDER PICKER & PROJECT MANAGEMENT
  // ================================
  
  const handleOpenProject = useCallback(async () => {
    try {
      console.log('🔍 Opening system folder picker...');
      
      // Use Tauri's native folder dialog
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
        defaultPath: undefined, // Let the OS decide the default location
      });
      
      if (selectedPath && typeof selectedPath === 'string') {
        console.log('📁 Selected folder:', selectedPath);
        
        // Store the selected path and show permission dialog
        setPendingProjectPath(selectedPath);
        setShowPermissionDialog(true);
      } else if (selectedPath === null) {
        console.log('📁 Folder selection cancelled by user');
      } else {
        console.log('📁 Invalid path returned from dialog:', selectedPath);
      }
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
    console.log('🏗️ Creating project tabs for:', project.rootPath);
    console.log('📁 Project data:', project);
    
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
            onFileChange={(file, _content) => {
              console.log(`File changed: ${file.name}`);
              setCurrentFile(file);
            }}
            onRequestAI={(context) => {
              console.log('🤖 AI request from editor:', context);
              // Switch to AI Assistant tab and prefill with context
              tabManager.switchToTab('ai-assistant');
            }}
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
      
      console.log('✅ Project tabs created successfully');
      console.log('📊 Active tabs:', tabManager.tabs.map(t => ({ id: t.id, title: t.title })));
      console.log('📌 Active tab:', tabManager.activeTabId);
      console.log('🖥️ Current view:', appViewModel.viewModel.currentView);
      
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
  }, [tabManager, appViewModel, currentFile]);

  const handlePermissionConfirm = useCallback(async () => {
    if (!pendingProjectPath) return;
    
    try {
      console.log('🔒 Checking folder permissions for:', pendingProjectPath);
      
      // Check if we have permissions to access this folder
      const permissionCheck = await invoke<any>('check_folder_permissions', {
        path: pendingProjectPath,
      });
      
      console.log('🔒 Permission check result:', permissionCheck);
      
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
      
      console.log('✅ Folder permissions verified, opening project...');
      
      // Call the backend directly to get project data
      const projectResult = await invoke<any>('open_project', {
        path: pendingProjectPath,
      });
      
      console.log('📁 Backend project result:', projectResult);
      
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
      
      console.log('🏗️ Creating tabs for project:', project.rootPath);
      
      // Create project tabs immediately with the project data we have
      await createProjectTabs(project);
      
      // Also update the view model state (this might be async)
      appViewModel.openProject(pendingProjectPath);
      
      console.log('✅ Project opened successfully with tabs created');
      
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
    console.log('📁 User cancelled permission request');
    setShowPermissionDialog(false);
    setPendingProjectPath(null);
  }, []);

  const handleSettings = () => {
    appViewModel.setCurrentView('settings');
  };

  // ================================
  // CONTEXT MENU HANDLERS
  // ================================
  
  const getContextMenuItems = () => {
    return getDefaultContextMenuItems(
      false, // hasSelection
      false, // isEditable
      appViewModel.viewModel.project?.rootPath
    );
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    contextMenu.showContextMenu(e.clientX, e.clientY, 'mouse');
  };

  // ================================
  // KEYBOARD SHORTCUTS
  // ================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'o':
            e.preventDefault();
            handleOpenProject();
            break;
          case ',':
            e.preventDefault();
            handleSettings();
            break;
          case 'k':
            e.preventDefault();
            // Focus AI assistant if in tabbed view
            if (appViewModel.viewModel.currentView === 'editor') {
              tabManager.switchToTab('ai-assistant');
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenProject, handleSettings, appViewModel.viewModel.currentView, tabManager]);

  // ================================
  // RENDER LOGIC
  // ================================
  
  if (appViewModel.viewModel.isLoading) {
    return <LoadingScreen />;
  }
  
  if (appViewModel.viewModel.error) {
    return (
      <ErrorScreen 
        error={appViewModel.viewModel.error} 
        onRetry={appViewModel.clearError}
      />
    );
  }

  return (
    <div 
      className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <Header 
        viewModel={appViewModel.viewModel}
        aiProviders={[]}
        onSettings={handleSettings}
        onTogglePerformanceMode={appViewModel.togglePerformanceMode}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {(() => {
          switch (appViewModel.viewModel.currentView) {
            case 'welcome':
              return (
                <WelcomeScreen 
                  onOpenProject={handleOpenProject}
                />
              );
              
            case 'editor':
              if (tabManager.tabs.length > 0) {
                return (
                  <TabLayout
                    tabs={tabManager.tabs}
                    activeTabId={tabManager.activeTabId}
                    onTabChange={tabManager.switchToTab}
                    onTabClose={tabManager.removeTab}
                    className="h-full"
                  />
                );
              }
              return (
                <div className="h-full bg-gray-900 text-white flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">📝</div>
                    <h2 className="text-2xl font-semibold mb-2">Code Editor</h2>
                    <p className="text-gray-400 mb-4">No project loaded</p>
                    <div className="text-xs text-gray-500 mb-4 space-y-1">
                      <div>Project in viewModel: {appViewModel.viewModel.project ? 'Yes' : 'No'}</div>
                      <div>Active tabs: {tabManager.tabs.length}</div>
                      <div>Tab IDs: {tabManager.tabs.map(t => t.id).join(', ') || 'None'}</div>
                    </div>
                    <button
                      onClick={handleOpenProject}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Open Project
                    </button>
                  </div>
                </div>
              );
              
            case 'chat':
              return <ChatView chatViewModel={chatViewModel} />;
              
            case 'settings':
              return <SettingsView />;
              
            default:
              return (
                <WelcomeScreen 
                  onOpenProject={handleOpenProject}
                />
              );
          }
        })()}
      </div>

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.contextMenu.visible}
        x={contextMenu.contextMenu.x}
        y={contextMenu.contextMenu.y}
        items={getContextMenuItems()}
        onClose={() => contextMenu.hideContextMenu('user_dismissed')}
      />

      {/* Permission Dialog */}
      {showPermissionDialog && (
        <PermissionRequestDialog
          isOpen={showPermissionDialog}
          onConfirm={handlePermissionConfirm}
          onCancel={handlePermissionCancel}
        />
      )}
    </div>
  );
};

export default App;
