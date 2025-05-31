// Syntari AI IDE - Header Component (Professional IDE Theme)
// Dark theme header with navigation, status indicators, and branding

import React from 'react';
import type { AppViewModel, ProjectContext, AiProvider } from '../types';

interface HeaderProps {
  viewModel: AppViewModel;
  currentProject?: ProjectContext;
  aiProviders?: AiProvider[];
  onNavigate: (view: AppViewModel['currentView']) => void;
  onOpenProject: () => void;
  onSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewModel,
  currentProject,
  aiProviders = [],
  onNavigate,
  onOpenProject,
  onSettings,
}) => {
  // Calculate AI status
  const availableProviders = aiProviders.filter(p => p.isAvailable).length;
  const totalProviders = aiProviders.length;
  const aiStatus = totalProviders > 0 ? `${availableProviders}/${totalProviders}` : '0/0';
  
  return (
    <header className="border-b border-gray-600/50 px-4 py-2 flex items-center justify-between text-gray-100 h-14" style={{ backgroundColor: '#3F3F3F' }}>
      {/* Left Section - Logo and VSCode-like Menu */}
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="Syntari AI IDE" 
            className="w-8 h-8 rounded-md"
          />
        </div>

        {/* VSCode-like File Menu */}
        <nav className="flex items-center space-x-6 text-sm">
          <button className="text-gray-200 hover:text-white transition-colors px-2 py-1 rounded">File</button>
          <button className="text-gray-200 hover:text-white transition-colors px-2 py-1 rounded">Terminal</button>
          <button className="text-gray-200 hover:text-white transition-colors px-2 py-1 rounded">Help</button>
          <button 
            onClick={onSettings}
            className="text-gray-200 hover:text-white transition-colors px-2 py-1 rounded"
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Right Section - Search Bar */}
      <div className="flex items-center space-x-4">
        {/* Search Bar */}
        <div className="relative">
          <img 
            src="/search.png" 
            alt="Search" 
            className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 opacity-60" 
          />
          <input
            type="text"
            placeholder="Search features..."
            className="bg-gray-700/50 border border-gray-500/40 rounded-md pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 text-white placeholder-gray-400"
          />
        </div>

        {/* AI Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600/40 border border-gray-500/30 rounded-md">
          <div className={`w-2 h-2 rounded-full ${
            availableProviders > 0 ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          <span className="text-xs text-gray-200">
            AI: {aiStatus}
          </span>
          {availableProviders > 0 && (
            <span className="text-xs text-green-400 font-medium">
              97% savings
            </span>
          )}
        </div>
      </div>
    </header>
  );
};