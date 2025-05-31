import React from 'react';

interface WelcomeScreenProps {
  onOpenProject: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenProject }) => {
  const handleAction = (action: string) => {
    console.log(`Action: ${action}`);
    // Implement specific actions here
    if (action === 'Open Project') {
      onOpenProject();
    }
  };

  return (
    <div className="h-full text-white relative overflow-y-auto" style={{ backgroundColor: '#262626' }}>
      {/* Professional Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/30 via-transparent to-slate-700/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)`
        }}></div>
      </div>
      
      {/* Subtle Logo Background */}
      <div className="fixed inset-0 flex items-center justify-center opacity-30 pointer-events-none z-0">
        <img 
          src="/logo.png" 
          alt="Syntari Logo" 
          className="w-[52rem] h-[52rem] object-contain filter brightness-75 grayscale"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col px-6 md:px-12 lg:px-16 xl:px-24 pt-12 md:pt-16 lg:pt-20 pb-8 md:pb-12">
        
        {/* Professional Header Section with User Details */}
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-4 tracking-tight">
              Welcome to <span className="font-medium text-blue-400">Syntari</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-400 font-light">
              AI Development Platform
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 md:space-x-8 text-sm md:text-base">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Free Plan</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-600"></div>
            <button className="flex items-center space-x-2 px-3 md:px-4 py-1 md:py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-md hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-200">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-blue-300 hover:text-blue-200">Upgrade to Pro</span>
            </button>
            <div className="hidden sm:block w-px h-4 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-400">Login</span>
            </div>
          </div>
        </div>
        
        {/* Professional Action Grid */}
        <div className="flex-1 flex items-start justify-center">
          <div className="w-full max-w-7xl 2xl:max-w-8xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12 lg:mb-16">
              {[
                { 
                  name: 'Open Project', 
                  icon: '/tree.png', 
                  desc: 'Browse and import existing codebases',
                  category: 'Development'
                },
                { 
                  name: 'Clone Repository', 
                  icon: '/Git-icon.png', 
                  desc: 'Clone from Git repositories and version control',
                  category: 'Source Control'
                },
                { 
                  name: 'Remote Environment', 
                  icon: '/terminal-gradient.png', 
                  desc: 'Connect to remote development environments',
                  category: 'Infrastructure'
                },
                { 
                  name: 'Code Playground', 
                  icon: '/sandbox.png', 
                  desc: 'Experimental development sandbox',
                  category: 'Development'
                },
                { 
                  name: 'Extension Manager', 
                  icon: '/plugin.png', 
                  desc: 'Install and manage development tools',
                  category: 'Tools'
                },
                { 
                  name: 'Workspace Optimizer', 
                  icon: '/clean-up.png', 
                  desc: 'Optimize storage and performance',
                  category: 'Maintenance'
                }
              ].map((action, index) => (
                <button
                  key={action.name}
                  onClick={() => handleAction(action.name)}
                  className="group relative bg-gray-800/40 hover:bg-gray-750/50 border border-gray-700/50 hover:border-gray-600/60 rounded-lg p-4 md:p-6 lg:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Category Badge */}
                  <div className="absolute top-3 md:top-4 right-3 md:right-4">
                    <span className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-700/30 rounded-md">
                      {action.category}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="mb-3 md:mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gray-700/40 rounded-lg flex items-center justify-center group-hover:bg-gray-600/40 transition-colors duration-300">
                      <img 
                        src={action.icon} 
                        alt={action.name} 
                        className="w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8 opacity-80 filter brightness-110" 
                      />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-white text-sm md:text-base lg:text-lg group-hover:text-blue-100 transition-colors duration-300">
                      {action.name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
                      {action.desc}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-lg"></div>
                </button>
              ))}
            </div>

            {/* Professional Utility Section */}
            <div className="border-t border-gray-700/40 pt-6 md:pt-8 mb-8 md:mb-12">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                {/* Left side - Quick Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-sm font-medium text-gray-400">Quick Actions:</span>
                  <div className="flex items-center space-x-3">
                    <button className="px-3 md:px-4 py-2 bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/40 rounded-md text-sm text-gray-300 hover:text-white transition-all duration-200">
                      Settings
                    </button>
                    <button className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/40 rounded-md text-sm text-gray-300 hover:text-white transition-all duration-200">
                      <img src="/terminal-gradient.png" alt="Terminal" className="w-4 h-4" />
                      <span>Terminal</span>
                    </button>
                  </div>
                </div>

                {/* Right side - AI Assistant Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-400">AI Assistant Ready</span>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-800/30 px-2 py-1 rounded">
                      500 requests remaining
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating AI Chat Widget */}
            <div className="flex justify-center px-4 md:px-0">
              <div className="w-full max-w-[600px] md:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px]">
                {/* Agent Mode and Toggle Group - Outside Container */}
                <div className="flex items-center justify-between mb-3 md:mb-4 px-2 md:px-4">
                  <div className="flex items-center space-x-3">
                    <img src="/change-mode.png" alt="Agent Mode" className="w-4 h-4 md:w-5 md:h-5 opacity-90" />
                    <h3 className="text-base md:text-lg font-semibold text-white">Agent Mode</h3>
                  </div>
                  <button className="p-2 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                    <img src="/toggle-group.png" alt="Toggle Group" className="w-5 h-5 md:w-6 md:h-6 opacity-90" />
                  </button>
                </div>

                {/* Chat Container */}
                <div 
                  className="bg-gray-800/60 backdrop-blur-sm border border-gray-600/40 rounded-xl p-4 md:p-6 lg:p-8 shadow-2xl animate-fade-in-up"
                  style={{ 
                    backgroundColor: 'rgba(66, 66, 66, 0.32)',
                    animationDelay: '400ms',
                    animationFillMode: 'both'
                  }}
                >
                  {/* Give a Task Section */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                      <span className="text-gray-200 font-medium text-sm md:text-base">Give a Task</span>
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <button className="p-1.5 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button className="p-1.5 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                          <img src="/enhance-prompt.png" alt="Enhance" className="w-4 h-4 md:w-5 md:h-5 opacity-90" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                          <img src="/microphone.png" alt="Microphone" className="w-4 h-4 md:w-5 md:h-5 opacity-90" />
                        </button>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Enter your task or question..."
                      className="w-full px-4 py-3 md:py-4 bg-gray-700/40 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-sm md:text-base"
                    />
                  </div>
                </div>

                {/* Remaining Requests - Outside Container */}
                <div className="mt-3 md:mt-4 px-2 md:px-4">
                  <p className="text-xs md:text-sm text-gray-500">Remaining requests: 500</p>
                </div>
              </div>
            </div>

            {/* Additional Content to Enable Scrolling */}
            <div className="mt-16 space-y-8">
              <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View All</button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center p-3 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-600/10 border border-blue-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 13h6v-2H9v2zM4 5v14h16V5H4zm18-2v18H2V3h20z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white truncate">syntari-ai-ide</span>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">TypeScript</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">/home/pajer/Documents/Businesses/Syntari</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        2h ago
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-green-600/10 border border-green-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white truncate">react-dashboard</span>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">React</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">/home/projects/react-dashboard</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        1d ago
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-600/10 border border-purple-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white truncate">ml-api-server</span>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">Python</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">/home/projects/ml-api-server</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        3d ago
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Recent Files</h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Clear History</button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center p-2.5 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-blue-600/10 border border-blue-600/20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate block">App.tsx</span>
                        <p className="text-xs text-gray-400 truncate">syntari-desktop/src/App.tsx</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        5m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-2.5 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-blue-600/10 border border-blue-600/20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate block">WelcomeScreen.tsx</span>
                        <p className="text-xs text-gray-400 truncate">syntari-desktop/src/components/WelcomeScreen.tsx</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        12m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-2.5 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-orange-600/10 border border-orange-600/20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 4v1.38c-.83-.33-1.72-.5-2.61-.5-1.79 0-3.58.68-4.95 2.05l3.33 3.33h1.11v1.11c.86.86 1.98 1.31 3.12 1.31.86 0 1.72-.22 2.5-.63V13h1.38c.86-.86 1.31-1.98 1.31-3.12 0-.86-.22-1.72-.63-2.5H12V4H9z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate block">App.css</span>
                        <p className="text-xs text-gray-400 truncate">syntari-desktop/src/App.css</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        18m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-2.5 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-green-600/10 border border-green-600/20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate block">vite.config.ts</span>
                        <p className="text-xs text-gray-400 truncate">syntari-desktop/vite.config.ts</p>
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        25m
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-yellow-400">Getting Started</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 bg-gray-700/20 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600/10 border border-blue-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">Open or Create a Project</h4>
                      <p className="text-xs text-gray-400">Start by opening an existing project or creating a new one to begin development</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-700/20 rounded-lg">
                    <div className="w-8 h-8 bg-green-600/10 border border-green-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">AI Assistant</h4>
                      <p className="text-xs text-gray-400">Use the chat panel to get intelligent code suggestions and development help</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-700/20 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600/10 border border-purple-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">Smart Routing</h4>
                      <p className="text-xs text-gray-400">Enable smart routing for optimal AI model selection based on your queries</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-700/20 rounded-lg">
                    <div className="w-8 h-8 bg-orange-600/10 border border-orange-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">Customize Settings</h4>
                      <p className="text-xs text-gray-400">Configure your IDE preferences, AI providers, and workspace settings</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Resource Monitoring</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Memory Usage</span>
                      <span className="text-xs text-blue-400">2.1 GB / 8 GB</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '26%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">CPU Usage</span>
                      <span className="text-xs text-green-400">15%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise Footer */}
              <div className="text-center py-8 border-t border-gray-700/40">
                <div className="space-y-3 text-xs text-gray-500">
                  <div className="flex items-center justify-center space-x-6">
                    <span>Syntari AI IDE v1.0.0</span>
                    <span>•</span>
                    <span>Enterprise Edition</span>
                  </div>
                  <div className="flex items-center justify-center space-x-6">
                    <span>SOC 2 Type II Compliant</span>
                    <span>•</span>
                    <span>FedRAMP Authorized</span>
                    <span>•</span>
                    <span>GDPR Ready</span>
                  </div>
                  <div className="text-gray-600 mt-4">
                    © 2024 Syntari Technologies. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 