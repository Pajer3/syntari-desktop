import React from 'react';

interface WelcomeScreenProps {
  onOpenProject: (path: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenProject }) => {
  const handleAction = (action: string) => {
    console.log(`Action: ${action}`);
    // Implement specific actions here
    if (action === 'Open Project') {
      onOpenProject('/home/pajer/Documents/Businesses/Syntari');
    }
  };

  return (
    <div className="h-full text-white relative overflow-hidden" style={{ backgroundColor: '#262626' }}>
      {/* Professional Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/30 via-transparent to-slate-700/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)`
        }}></div>
      </div>
      
      {/* Subtle Logo Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-3">
        <img 
          src="/logo.png" 
          alt="Syntari Logo" 
          className="w-[32rem] h-[32rem] object-contain filter brightness-75 grayscale"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col px-12 pt-16 pb-12">
        
        {/* Professional Header Section with User Details */}
        <div className="text-center mb-16">
          <div className="mb-6">
            <h1 className="text-4xl font-light text-white mb-3 tracking-tight">
              Welcome to <span className="font-medium text-blue-400">Syntari</span>
            </h1>
            <p className="text-lg text-gray-400 font-light">
              AI Development Platform
            </p>
          </div>
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Free Plan</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <button className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-md hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-200">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-blue-300 hover:text-blue-200">Upgrade to Pro</span>
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-400">pajer@syntari.com</span>
            </div>
          </div>
        </div>
        
        {/* Professional Action Grid */}
        <div className="flex-1 flex items-start justify-center">
          <div className="w-full max-w-7xl">
            <div className="grid grid-cols-3 gap-6 mb-8">
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
                  className="group relative bg-gray-800/40 hover:bg-gray-750/50 border border-gray-700/50 hover:border-gray-600/60 rounded-lg p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-700/30 rounded-md">
                      {action.category}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="mb-4">
                    <div className="w-12 h-12 bg-gray-700/40 rounded-lg flex items-center justify-center group-hover:bg-gray-600/40 transition-colors duration-300">
                      <img 
                        src={action.icon} 
                        alt={action.name} 
                        className="w-7 h-7 opacity-80 filter brightness-110" 
                      />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-white text-base group-hover:text-blue-100 transition-colors duration-300">
                      {action.name}
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
                      {action.desc}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-lg"></div>
                </button>
              ))}
            </div>

            {/* Professional Utility Section */}
            <div className="border-t border-gray-700/40 pt-6 mb-8">
              <div className="flex items-center justify-between">
                {/* Left side - Quick Actions */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-400">Quick Actions:</span>
                  <button className="px-4 py-2 bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/40 rounded-md text-sm text-gray-300 hover:text-white transition-all duration-200">
                    Settings
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/40 rounded-md text-sm text-gray-300 hover:text-white transition-all duration-200">
                    <img src="/terminal-gradient.png" alt="Terminal" className="w-4 h-4" />
                    <span>Terminal</span>
                  </button>
                </div>

                {/* Right side - AI Assistant Status */}
                <div className="flex items-center space-x-6">
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
            <div className="flex justify-center">
              <div className="w-full max-w-[800px]">
                {/* Agent Mode and Toggle Group - Outside Container */}
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center space-x-3">
                    <img src="/change-mode.png" alt="Agent Mode" className="w-5 h-5 opacity-90" />
                    <h3 className="text-lg font-semibold text-white">Agent Mode</h3>
                  </div>
                  <button className="p-2 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                    <img src="/toggle-group.png" alt="Toggle Group" className="w-6 h-6 opacity-90" />
                  </button>
                </div>

                {/* Chat Container */}
                <div 
                  className="bg-gray-800/60 backdrop-blur-sm border border-gray-600/40 rounded-xl p-6 shadow-2xl animate-fade-in-up"
                  style={{ 
                    backgroundColor: 'rgba(66, 66, 66, 0.32)',
                    animationDelay: '400ms',
                    animationFillMode: 'both'
                  }}
                >
                  {/* Give a Task Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-200 font-medium">Give a Task</span>
                      <div className="flex items-center space-x-3">
                        <button className="p-1.5 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button className="p-1.5 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                          <img src="/enhance-prompt.png" alt="Enhance" className="w-5 h-5 opacity-90" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-600/50 rounded transition-all duration-200 hover:scale-105">
                          <img src="/microphone.png" alt="Microphone" className="w-5 h-5 opacity-90" />
                        </button>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Enter your task or question..."
                      className="w-full px-4 py-3 bg-gray-700/40 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Remaining Requests - Outside Container */}
                <div className="mt-3 px-2">
                  <p className="text-xs text-gray-500">Remaining requests: 500</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 