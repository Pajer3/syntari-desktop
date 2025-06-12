import React from 'react';
import { ActionCard } from './ui/ActionCard';
import { RecentProjectsList } from './ui/RecentProjectsList';
import { RecentFilesList } from './ui/RecentFilesList';
import { GettingStartedSection } from './ui/GettingStartedSection';
import { ResourceMonitoring } from './ui/ResourceMonitoring';
import { WELCOME_ACTIONS, GETTING_STARTED_STEPS } from '../constants/welcomeData';

interface WelcomeScreenProps {
  onOpenProject: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenProject }) => {
  const handleAction = (action: string) => {
    console.log(`Action: ${action}`);
    
    // Simple action handling - just like the original
    if (action === 'Open Project') {
      onOpenProject();
    } else {
      // Future: Implement other actions
      console.log('Action not implemented yet:', action);
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
        
        {/* Professional Action Grid - 6 Cards in 3 Columns */}
        <div className="flex-1 flex items-start justify-center">
          <div className="w-full max-w-7xl 2xl:max-w-8xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12 lg:mb-16">
              {WELCOME_ACTIONS.map((action, index) => (
                <ActionCard
                  key={action.name}
                  name={action.name}
                  icon={action.icon}
                  description={action.description}
                  category={action.category}
                  index={index}
                  onClick={handleAction}
                />
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
              {/* Recent Projects using extracted component */}
              <RecentProjectsList />

              {/* Recent Files using extracted component */}
              <RecentFilesList />

              {/* Getting Started using extracted component */}
              <GettingStartedSection steps={GETTING_STARTED_STEPS} />

              {/* Resource Monitoring using extracted component */}
              <ResourceMonitoring />
            </div>
          </div>
        </div>
      </div>

             
    </div>
  );
}; 