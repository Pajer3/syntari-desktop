// Syntari AI IDE - Main Application (MVVM View Layer)
// Enterprise AI router desktop application with multi-model consensus

import React from 'react';
import { useAppViewModel } from './hooks/useAppViewModel';
import { useChatViewModel } from './hooks/useChatViewModel';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
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

const WelcomeView: React.FC<{ onOpenProject: (path: string) => void }> = ({ onOpenProject }) => (
  <div className="h-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white overflow-y-auto">
    <div className="container mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Welcome to Syntari AI IDE
        </h1>
        <p className="text-xl text-gray-300 mb-2">
          Enterprise AI Router with Multi-Model Consensus
        </p>
        <p className="text-sm text-gray-400">
          🎯 97% Cost Savings • 🔒 Zero Vendor Lock-in • ⚡ Smart Routing
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
          <div className="text-3xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold mb-2">Multi-Model AI</h3>
          <p className="text-gray-400 text-sm">
            Route requests to Claude, GPT-4, or Gemini based on task complexity and cost optimization.
          </p>
        </div>
        
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-lg font-semibold mb-2">Cost Optimization</h3>
          <p className="text-gray-400 text-sm">
            Smart routing to Gemini for simple tasks saves 97% compared to premium models.
          </p>
        </div>
        
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
          <div className="text-3xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
          <p className="text-gray-400 text-sm">
            SOC 2, FedRAMP, and GDPR compliant with zero vendor lock-in architecture.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-6">Get Started</h2>
        <div className="space-y-4">
          <button 
            onClick={() => onOpenProject('/home/pajer/Documents/Businesses/Syntari')}
            className="block w-full max-w-md mx-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-lg font-medium"
          >
            📁 Open Current Project
          </button>
          
          <button 
            onClick={() => onOpenProject('/tmp/demo-project')}
            className="block w-full max-w-md mx-auto px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            🚀 Create New Project
          </button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>✅ CLI Backend Integrated • ✅ Multi-Model Routing • ✅ Cost Optimization Active</p>
      </div>
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

  // ================================
  // MAIN LAYOUT STRUCTURE
  // ================================
  
  if (appViewModel.viewModel.isLoading) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <Header 
          viewModel={appViewModel.viewModel}
          currentProject={appViewModel.viewModel.project}
          aiProviders={[]}
          onNavigate={appViewModel.setCurrentView}
          onOpenProject={handleOpenProject}
          onSettings={handleSettings}
        />
        <div className="flex-1">
          <LoadingScreen />
        </div>
      </div>
    );
  }
  
  if (appViewModel.viewModel.error) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <Header 
          viewModel={appViewModel.viewModel}
          currentProject={appViewModel.viewModel.project}
          aiProviders={[]}
          onNavigate={appViewModel.setCurrentView}
          onOpenProject={handleOpenProject}
          onSettings={handleSettings}
        />
        <div className="flex-1">
          <ErrorScreen 
            error={appViewModel.viewModel.error}
            onRetry={appViewModel.clearError}
          />
        </div>
      </div>
    );
  }
  
  // Main IDE Layout
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Always visible header */}
      <Header 
        viewModel={appViewModel.viewModel}
        currentProject={appViewModel.viewModel.project}
        aiProviders={chatViewModel.viewModel.availableProviders}
        onNavigate={appViewModel.setCurrentView}
        onOpenProject={handleOpenProject}
        onSettings={handleSettings}
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
    </div>
  );
};

export default App;
