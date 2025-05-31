// Syntari AI IDE - Recent Files List Component
// Extracted from WelcomeScreen.tsx for better maintainability

import React from 'react';

interface RecentFile {
  name: string;
  path: string;
  lastAccessed: string;
  type: 'typescript' | 'css' | 'config' | 'other';
}

interface RecentFilesListProps {
  files?: RecentFile[];
}

const defaultFiles: RecentFile[] = [
  {
    name: 'App.tsx',
    path: 'syntari-desktop/src/App.tsx',
    lastAccessed: '5m',
    type: 'typescript',
  },
  {
    name: 'WelcomeScreen.tsx',
    path: 'syntari-desktop/src/components/WelcomeScreen.tsx',
    lastAccessed: '12m',
    type: 'typescript',
  },
  {
    name: 'App.css',
    path: 'syntari-desktop/src/App.css',
    lastAccessed: '18m',
    type: 'css',
  },
  {
    name: 'vite.config.ts',
    path: 'syntari-desktop/vite.config.ts',
    lastAccessed: '25m',
    type: 'config',
  },
];

export const RecentFilesList: React.FC<RecentFilesListProps> = ({
  files = defaultFiles,
}) => {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'typescript': return '🔷';
      case 'css': return '🎨';
      case 'config': return '⚙️';
      default: return '📄';
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'typescript': return 'blue';
      case 'css': return 'orange';
      case 'config': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Files</h3>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Clear History</button>
      </div>
      <div className="space-y-1">
        {files.map((file, index) => {
          const color = getFileColor(file.type);
          return (
            <div key={index} className="flex items-center p-2.5 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-8 h-8 bg-${color}-600/10 border border-${color}-600/20 rounded flex items-center justify-center`}>
                  <span className="text-sm">{getFileIcon(file.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white truncate block">{file.name}</span>
                  <p className="text-xs text-gray-400 truncate">{file.path}</p>
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  {file.lastAccessed}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 