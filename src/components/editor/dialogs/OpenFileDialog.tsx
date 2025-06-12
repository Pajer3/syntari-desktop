// Syntari AI IDE - Open File Dialog Component
// VS Code-style file browser with search and recent files

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedFileIcon } from '../../ui/EnhancedFileIcon';
import { fileSystemService } from '../../../services/fileSystemService';
import type { FileNode } from '../../../types/fileSystem';

interface OpenFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (filePath: string) => Promise<void>;
  projectRootPath?: string;
  recentFiles?: string[];
}

export const OpenFileDialog: React.FC<OpenFileDialogProps> = ({
  isOpen,
  onClose,
  onOpenFile,
  projectRootPath = '',
  recentFiles = [],
}) => {
  const [currentPath, setCurrentPath] = useState(projectRootPath);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPath(projectRootPath);
      setSelectedFile(null);
      setSearchQuery('');
      setShowRecentFiles(true);
      setIsLoading(false);
      setError(null);
      setSelectedIndex(0);
      
      // Focus search input with a small delay
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      // Load initial files
      if (projectRootPath) {
        loadFiles(projectRootPath);
      }
    }
  }, [isOpen, projectRootPath]);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = files.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
    setFilteredFiles(filtered);
    setSelectedIndex(0);
  }, [searchQuery, files]);

  const loadFiles = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading files from:', path);
      const folderContents = await fileSystemService.loadFolderContents(path, false);
      
      // Sort: directories first, then files, both alphabetically
      const sortedFiles = folderContents.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sortedFiles);
      console.log('✅ Loaded', sortedFiles.length, 'files');
    } catch (error) {
      console.error('❌ Failed to load files:', error);
      setError(error instanceof Error ? error.message : 'Failed to load files');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback((file: FileNode, index: number) => {
    setSelectedIndex(index);
    if (file.isDirectory) {
      setCurrentPath(file.path);
      setSelectedFile(null);
      loadFiles(file.path);
    } else {
      setSelectedFile(file.path);
    }
  }, [loadFiles]);

  const handleFileDoubleClick = useCallback(async (file: FileNode) => {
    if (!file.isDirectory) {
      try {
        await onOpenFile(file.path);
        onClose();
      } catch (error) {
        console.error('Failed to open file:', error);
        setError(error instanceof Error ? error.message : 'Failed to open file');
      }
    }
  }, [onOpenFile, onClose]);

  const handleRecentFileSelect = useCallback(async (filePath: string) => {
    try {
      await onOpenFile(filePath);
      onClose();
    } catch (error) {
      console.error('Failed to open recent file:', error);
      setError(error instanceof Error ? error.message : 'Failed to open file');
    }
  }, [onOpenFile, onClose]);

  const handleOpen = useCallback(async () => {
    if (selectedFile) {
      try {
        await onOpenFile(selectedFile);
        onClose();
      } catch (error) {
        console.error('Failed to open file:', error);
        setError(error instanceof Error ? error.message : 'Failed to open file');
      }
    } else if (filteredFiles[selectedIndex] && !filteredFiles[selectedIndex].isDirectory) {
      try {
        await onOpenFile(filteredFiles[selectedIndex].path);
        onClose();
      } catch (error) {
        console.error('Failed to open file:', error);
        setError(error instanceof Error ? error.message : 'Failed to open file');
      }
    }
  }, [selectedFile, filteredFiles, selectedIndex, onOpenFile, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleOpen();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = showRecentFiles ? recentFiles.length - 1 : filteredFiles.length - 1;
      setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
    }
  }, [onClose, handleOpen, showRecentFiles, recentFiles.length, filteredFiles.length]);

  const navigateUp = useCallback(() => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath && parentPath !== currentPath && parentPath.includes(projectRootPath)) {
      setCurrentPath(parentPath);
      setSelectedFile(null);
      setSelectedIndex(0);
      loadFiles(parentPath);
    }
  }, [currentPath, projectRootPath, loadFiles]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDisplayPath = () => {
    if (!currentPath) return '/';
    return currentPath.replace(projectRootPath, './') || './';
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" 
      onClick={handleCancel}
    >
      <div 
        className="bg-vscode-bg border border-vscode-border rounded-lg shadow-2xl w-[700px] h-[500px] max-w-90vw max-h-90vh flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-vscode-border">
          <h2 className="text-lg font-semibold text-vscode-fg">Open File</h2>
          <p className="text-sm text-vscode-fg-muted mt-1">
            Browse and select a file to open
          </p>
        </div>

        {/* Search and Navigation */}
        <div className="p-4 border-b border-vscode-border space-y-3">
          {/* Search Input */}
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="
              w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded
              text-vscode-fg placeholder-vscode-fg-muted
              focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-vscode-accent
              transition-all duration-200
            "
          />

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={navigateUp}
              disabled={!currentPath || currentPath === projectRootPath}
              className="
                px-3 py-1 text-sm font-medium text-vscode-fg
                border border-vscode-border rounded hover:bg-vscode-list-hover
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              ↑ Up
            </button>
            <span className="text-sm text-vscode-fg-muted flex items-center">
              <span className="mr-2">📁</span>
              {getDisplayPath()}
            </span>
          </div>

          {/* View Toggle */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowRecentFiles(false)}
              className={`
                px-3 py-1 text-sm font-medium rounded
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                transition-all duration-200
                ${!showRecentFiles 
                  ? 'bg-vscode-accent text-white' 
                  : 'text-vscode-fg border border-vscode-border hover:bg-vscode-list-hover'
                }
              `}
            >
              Browse Files
            </button>
            {recentFiles.length > 0 && (
              <button
                onClick={() => setShowRecentFiles(true)}
                className={`
                  px-3 py-1 text-sm font-medium rounded
                  focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  transition-all duration-200
                  ${showRecentFiles 
                    ? 'bg-vscode-accent text-white' 
                    : 'text-vscode-fg border border-vscode-border hover:bg-vscode-list-hover'
                  }
                `}
              >
                Recent Files ({recentFiles.length})
              </button>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-400 mb-2 text-lg">⚠️ Error</div>
                <div className="text-vscode-fg-muted">{error}</div>
                <button
                  onClick={() => loadFiles(currentPath)}
                  className="mt-3 px-3 py-1 text-sm bg-vscode-accent text-white rounded hover:bg-vscode-accent-hover transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-vscode-fg-muted">
                <div className="animate-spin w-5 h-5 border-2 border-vscode-accent border-t-transparent rounded-full"></div>
                <span>Loading files...</span>
              </div>
            </div>
          ) : showRecentFiles && recentFiles.length > 0 ? (
            <div ref={listRef} className="h-full overflow-y-auto">
              <div className="p-2">
                <h3 className="text-sm font-medium text-vscode-fg mb-2 px-2">Recent Files</h3>
                {recentFiles.map((filePath, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={index}
                      onClick={() => handleRecentFileSelect(filePath)}
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded cursor-pointer
                        transition-all duration-150
                        ${isSelected 
                          ? 'bg-vscode-list-active text-vscode-list-active-fg' 
                          : 'hover:bg-vscode-list-hover'
                        }
                      `}
                    >
                      <EnhancedFileIcon 
                  fileName={filePath.split('/').pop() || filePath}
                  size={20}
                  className="file-icon"
                />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-vscode-fg truncate">{filePath.split('/').pop()}</div>
                        <div className="text-xs text-vscode-fg-muted truncate">{filePath}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div ref={listRef} className="h-full overflow-y-auto">
              <div className="p-2">
                {filteredFiles.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-vscode-fg-muted">
                    {searchQuery ? 'No files match your search' : 'No files found'}
                  </div>
                ) : (
                  filteredFiles.map((file, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={file.path}
                        onClick={() => handleFileSelect(file, index)}
                        onDoubleClick={() => handleFileDoubleClick(file)}
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
                          <EnhancedFileIcon 
                    fileName={file.name}
                    isDirectory={file.isDirectory}
                    size={16}
                    className="file-icon"
                  />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-vscode-fg truncate">{file.name}</div>
                          {!file.isDirectory && (
                            <div className="text-xs text-vscode-fg-muted">
                              {formatFileSize(file.size)}
                              {file.lastModified && (
                                <span className="ml-2">
                                  {new Date(file.lastModified).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="px-4 py-2 bg-vscode-sidebar border-t border-vscode-border">
            <div className="text-sm text-vscode-fg-muted">
              <span>Selected: </span>
              <span className="font-mono text-vscode-fg">{selectedFile}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center p-4 border-t border-vscode-border">
          <div className="text-xs text-vscode-fg-muted">
            <div className="flex items-center space-x-4">
              <span>Double-click to open</span>
              <span><kbd className="px-1 bg-vscode-keybinding-bg rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 bg-vscode-keybinding-bg rounded">Enter</kbd> Open</span>
              <span><kbd className="px-1 bg-vscode-keybinding-bg rounded">Esc</kbd> Cancel</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="
                px-4 py-2 text-sm font-medium text-vscode-fg
                border border-vscode-border rounded hover:bg-vscode-list-hover
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                transition-all duration-200
              "
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpen}
              disabled={!selectedFile && (!filteredFiles[selectedIndex] || filteredFiles[selectedIndex]?.isDirectory)}
              className="
                px-4 py-2 text-sm font-medium text-white
                bg-vscode-accent hover:bg-vscode-accent-hover
                border border-vscode-accent rounded
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 