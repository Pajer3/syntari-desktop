// Syntari AI IDE - Main Application (MVVM View Layer)
// Enterprise AI router desktop application with multi-model consensus

import React from 'react';
import { useAppViewModel } from './hooks/useAppViewModel';
import { useChatViewModel } from './hooks/useChatViewModel';
import { useContextMenu } from './hooks/useContextMenu';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ContextMenu, getDefaultContextMenuItems } from './components/ContextMenu';
import './App.css';

// ================================
// VIEW COMPONENTS
// ================================

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
          viewModel.session.messages.map((message, index) => (
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

const EditorView: React.FC = () => (
  <div className="h-full bg-gray-900 text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">📝</div>
      <h2 className="text-2xl font-semibold mb-2">Code Editor</h2>
      <p className="text-gray-400">Coming soon - Full-featured code editor with AI integration</p>
    </div>
  </div>
);

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
  // HANDLERS
  // ================================
  
  const handleOpenProject = () => {
    // For now, use the predefined project path
    appViewModel.openProject('/home/pajer/Documents/Businesses/Syntari');
  };

  const handleSettings = () => {
    appViewModel.setCurrentView('settings');
  };

  // Context menu items based on current view
  const getContextMenuItems = () => {
    const hasSelection = (window.getSelection()?.toString().length ?? 0) > 0;
    const isChatView = appViewModel.viewModel.currentView === 'chat';
    
    return getDefaultContextMenuItems(
      hasSelection,
      isChatView, // Chat input is editable
      appViewModel.viewModel.project?.rootPath
    );
  };

  // ================================
  // MAIN LAYOUT STRUCTURE
  // ================================
  
  if (appViewModel.viewModel.isLoading) {
    return (
      <div 
        className={`h-screen flex flex-col bg-gray-900 ${
          appViewModel.viewModel.performanceMode ? 'performance-mode' : ''
        }`}
        onContextMenu={contextMenu.handleContextMenu}
      >
        <Header 
          viewModel={appViewModel.viewModel}
          currentProject={appViewModel.viewModel.project}
          aiProviders={[]}
          onNavigate={appViewModel.setCurrentView}
          onOpenProject={handleOpenProject}
          onSettings={handleSettings}
          onTogglePerformanceMode={appViewModel.togglePerformanceMode}
        />
        <div className="flex-1">
          <LoadingScreen />
        </div>
        
        {/* Context Menu */}
        <ContextMenu
          visible={contextMenu.contextMenu.visible}
          x={contextMenu.contextMenu.x}
          y={contextMenu.contextMenu.y}
          items={getContextMenuItems()}
          onClose={contextMenu.hideContextMenu}
        />
      </div>
    );
  }
  
  if (appViewModel.viewModel.error) {
    return (
      <div 
        className={`h-screen flex flex-col bg-gray-900 ${
          appViewModel.viewModel.performanceMode ? 'performance-mode' : ''
        }`}
        onContextMenu={contextMenu.handleContextMenu}
      >
        <Header 
          viewModel={appViewModel.viewModel}
          currentProject={appViewModel.viewModel.project}
          aiProviders={[]}
          onNavigate={appViewModel.setCurrentView}
          onOpenProject={handleOpenProject}
          onSettings={handleSettings}
          onTogglePerformanceMode={appViewModel.togglePerformanceMode}
        />
        <div className="flex-1">
          <ErrorScreen 
            error={appViewModel.viewModel.error}
            onRetry={appViewModel.clearError}
          />
        </div>
        
        {/* Context Menu */}
        <ContextMenu
          visible={contextMenu.contextMenu.visible}
          x={contextMenu.contextMenu.x}
          y={contextMenu.contextMenu.y}
          items={getContextMenuItems()}
          onClose={contextMenu.hideContextMenu}
        />
      </div>
    );
  }
  
  // Main IDE Layout
  return (
    <div 
      className={`h-screen flex flex-col bg-gray-900 ${
        appViewModel.viewModel.performanceMode ? 'performance-mode' : ''
      }`}
      onContextMenu={contextMenu.handleContextMenu}
    >
      {/* Always visible header */}
      <Header 
        viewModel={appViewModel.viewModel}
        currentProject={appViewModel.viewModel.project}
        aiProviders={[]}
        onNavigate={appViewModel.setCurrentView}
        onOpenProject={handleOpenProject}
        onSettings={handleSettings}
        onTogglePerformanceMode={appViewModel.togglePerformanceMode}
      />
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {(() => {
          switch (appViewModel.viewModel.currentView) {
            case 'welcome':
              return <WelcomeScreen onOpenProject={appViewModel.openProject} />;
              
            case 'chat':
              return <ChatView chatViewModel={chatViewModel} />;
              
            case 'editor':
              return <EditorView />;
              
            case 'settings':
              return <SettingsView />;
              
            default:
              return <WelcomeScreen onOpenProject={appViewModel.openProject} />;
          }
        })()}
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.contextMenu.visible}
        x={contextMenu.contextMenu.x}
        y={contextMenu.contextMenu.y}
        items={getContextMenuItems()}
        onClose={contextMenu.hideContextMenu}
      />
    </div>
  );
};

export default App;
