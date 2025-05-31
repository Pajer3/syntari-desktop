// Syntari AI IDE - Recent Projects List Component
// Extracted from WelcomeScreen.tsx for better maintainability

import React from 'react';

interface RecentProject {
  name: string;
  type: string;
  path: string;
  lastAccessed: string;
  icon: string;
}

interface RecentProjectsListProps {
  projects?: RecentProject[];
}

const defaultProjects: RecentProject[] = [
  {
    name: 'syntari-ai-ide',
    type: 'TypeScript',
    path: '/home/pajer/Documents/Businesses/Syntari',
    lastAccessed: '2h ago',
    icon: '📘',
  },
  {
    name: 'react-dashboard',
    type: 'React',
    path: '/home/projects/react-dashboard',
    lastAccessed: '1d ago',
    icon: '💚',
  },
  {
    name: 'ml-api-server',
    type: 'Python',
    path: '/home/projects/ml-api-server',
    lastAccessed: '3d ago',
    icon: '🔷',
  },
];

export const RecentProjectsList: React.FC<RecentProjectsListProps> = ({
  projects = defaultProjects,
}) => {
  const getProjectIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'typescript': return '🔷';
      case 'react': return '⚛️';
      case 'python': return '🐍';
      case 'rust': return '🦀';
      default: return '📁';
    }
  };

  const getProjectColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'typescript': return 'blue';
      case 'react': return 'green';
      case 'python': return 'purple';
      case 'rust': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View All</button>
      </div>
      <div className="space-y-1">
        {projects.map((project, index) => {
          const color = getProjectColor(project.type);
          return (
            <div 
              key={index}
              className="flex items-center p-3 hover:bg-gray-700/20 rounded-lg transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className={`w-10 h-10 bg-${color}-600/10 border border-${color}-600/20 rounded-lg flex items-center justify-center`}>
                  <span className="text-lg">{getProjectIcon(project.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white truncate">{project.name}</span>
                    <span className={`text-xs text-${color}-400 bg-gray-700/50 px-1.5 py-0.5 rounded`}>
                      {project.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{project.path}</p>
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  {project.lastAccessed}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 