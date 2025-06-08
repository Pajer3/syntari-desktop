// Syntari AI IDE - Directory Browser Component
// Embeddable directory navigation for file dialogs

import React, { useState, useEffect, useCallback } from 'react';
import { fileSystemService } from '../../services/fileSystemService';
import type { FileNode } from '../../types/fileSystem';

interface DirectoryBrowserProps {
  currentPath: string;
  onPathChange: (newPath: string) => void;
  onSelectPath?: (selectedPath: string) => void;
  showFiles?: boolean;
  allowNavigation?: boolean;
  height?: string;
  projectRootPath?: string;
}

export const DirectoryBrowser: React.FC<DirectoryBrowserProps> = ({
  currentPath,
  onPathChange,
  onSelectPath,
  showFiles = false,
  allowNavigation = true,
  height = '300px',
  projectRootPath = '',
}) => {
  const [directories, setDirectories] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load directory contents
  const loadDirectories = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contents = await fileSystemService.loadFolderContents(path, false);
      
      // Filter to only directories unless showFiles is true
      const filtered = showFiles 
        ? contents 
        : contents.filter(item => item.isDirectory);
      
      setDirectories(filtered);
    } catch (error) {
      console.error('Failed to load directories:', error);
      setError(error instanceof Error ? error.message : 'Failed to load directories');
      setDirectories([]);
    } finally {
      setIsLoading(false);
    }
  }, [showFiles]);

  // Load initial directories
  useEffect(() => {
    if (currentPath) {
      loadDirectories(currentPath);
    }
  }, [currentPath, loadDirectories]);

  const handleDirectoryClick = useCallback((directory: FileNode) => {
    if (!allowNavigation) return;

    if (directory.isDirectory) {
      const newPath = directory.path;
      setSelectedPath(newPath);
      
      if (onSelectPath) {
        onSelectPath(newPath);
      }
    }
  }, [allowNavigation, onSelectPath]);

  const handleDirectoryDoubleClick = useCallback((directory: FileNode) => {
    if (!allowNavigation || !directory.isDirectory) return;

    const newPath = directory.path;
    onPathChange(newPath);
    setSelectedPath(null);
  }, [allowNavigation, onPathChange]);

  const navigateUp = useCallback(() => {
    if (!allowNavigation) return;

    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath && parentPath !== currentPath) {
      // Don't navigate above project root if specified
      if (projectRootPath && !parentPath.startsWith(projectRootPath)) {
        return;
      }
      onPathChange(parentPath);
      setSelectedPath(null);
    }
  }, [currentPath, allowNavigation, onPathChange, projectRootPath]);

  const getDisplayPath = () => {
    if (!currentPath) return '/';
    if (projectRootPath) {
      return currentPath.replace(projectRootPath, './') || './';
    }
    return currentPath;
  };

  const canNavigateUp = () => {
    if (!allowNavigation) return false;
    if (projectRootPath) {
      return currentPath !== projectRootPath && currentPath.startsWith(projectRootPath);
    }
    return currentPath && currentPath !== '/';
  };

  return (
    <div className="flex flex-col">
      {/* Navigation Header */}
      <div className="flex items-center space-x-2 p-2 border-b border-vscode-border">
        <button
          onClick={navigateUp}
          disabled={!canNavigateUp()}
          className="
            px-2 py-1 text-sm font-medium text-vscode-fg
            border border-vscode-border rounded hover:bg-vscode-list-hover
            focus:outline-none focus:ring-2 focus:ring-vscode-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          "
          title="Go up one level"
        >
          ↑ Up
        </button>
        <div className="flex-1 flex items-center text-sm text-vscode-fg-muted">
          <span className="mr-2">📁</span>
          <span className="font-mono">{getDisplayPath()}</span>
        </div>
        <button
          onClick={() => loadDirectories(currentPath)}
          disabled={isLoading}
          className="
            px-2 py-1 text-sm font-medium text-vscode-fg
            border border-vscode-border rounded hover:bg-vscode-list-hover
            focus:outline-none focus:ring-2 focus:ring-vscode-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          "
          title="Refresh"
        >
          🔄
        </button>
      </div>

      {/* Directory List */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ height }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-400 mb-2 text-lg">⚠️ Error</div>
              <div className="text-vscode-fg-muted text-sm">{error}</div>
              <button
                onClick={() => loadDirectories(currentPath)}
                className="mt-2 px-3 py-1 text-sm bg-vscode-accent text-white rounded hover:bg-vscode-accent-hover transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-2 text-vscode-fg-muted">
              <div className="animate-spin w-4 h-4 border-2 border-vscode-accent border-t-transparent rounded-full"></div>
              <span>Loading directories...</span>
            </div>
          </div>
        ) : directories.length === 0 ? (
          <div className="flex items-center justify-center h-full text-vscode-fg-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">📁</div>
              <p>No {showFiles ? 'items' : 'directories'} found</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {directories.map((item) => {
              const isSelected = item.path === selectedPath;
              return (
                <div
                  key={item.path}
                  onClick={() => handleDirectoryClick(item)}
                  onDoubleClick={() => handleDirectoryDoubleClick(item)}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded cursor-pointer
                    transition-all duration-150
                    ${isSelected 
                      ? 'bg-vscode-list-active text-vscode-list-active-fg' 
                      : 'hover:bg-vscode-list-hover'
                    }
                  `}
                >
                  <span className="text-lg">
                    {item.isDirectory ? '📁' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-vscode-fg truncate">{item.name}</div>
                    {item.lastModified && (
                      <div className="text-xs text-vscode-fg-muted">
                        {new Date(item.lastModified * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Path Info */}
      {selectedPath && (
        <div className="p-2 bg-vscode-sidebar border-t border-vscode-border">
          <div className="text-sm text-vscode-fg-muted">
            <span>Selected: </span>
            <span className="font-mono text-vscode-fg">{selectedPath}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 