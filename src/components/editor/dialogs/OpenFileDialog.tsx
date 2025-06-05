// Syntari AI IDE - Open File Dialog Component
// VS Code-style file browser with search and recent files

import React, { useState, useEffect, useRef } from 'react';
import { getFileIcon } from '../../../utils/editorUtils';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: Date;
  children?: FileNode[];
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPath(projectRootPath);
      setSelectedFile(null);
      setSearchQuery('');
      setShowRecentFiles(true);
      setIsLoading(false);
      
      // Focus search input with a small delay
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      // Load initial files
      loadFiles(projectRootPath);
    }
  }, [isOpen, projectRootPath]);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = files.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
    setFilteredFiles(filtered);
  }, [searchQuery, files]);

  const loadFiles = async (path: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual file system API call
      // This is a mock implementation
      const mockFiles: FileNode[] = [
        { name: 'src', path: `${path}/src`, isDirectory: true },
        { name: 'package.json', path: `${path}/package.json`, isDirectory: false, size: 1024 },
        { name: 'README.md', path: `${path}/README.md`, isDirectory: false, size: 2048 },
        { name: 'tsconfig.json', path: `${path}/tsconfig.json`, isDirectory: false, size: 512 },
      ];
      
      setFiles(mockFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      setSelectedFile(null);
      loadFiles(file.path);
    } else {
      setSelectedFile(file.path);
    }
  };

  const handleFileDoubleClick = async (file: FileNode) => {
    if (!file.isDirectory) {
      try {
        await onOpenFile(file.path);
        onClose();
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const handleOpen = async () => {
    if (selectedFile) {
      try {
        await onOpenFile(selectedFile);
        onClose();
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter' && selectedFile) {
      e.preventDefault();
      handleOpen();
    }
  };

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath && parentPath !== currentPath) {
      setCurrentPath(parentPath);
      setSelectedFile(null);
      loadFiles(parentPath);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
      <div 
        className="bg-vscode-bg border border-vscode-border rounded-md shadow-lg w-[700px] h-[500px] max-w-90vw max-h-90vh flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
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
              w-full px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded
              text-vscode-fg placeholder-vscode-fg-muted
              focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-vscode-accent
            "
          />

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={navigateUp}
              disabled={!currentPath || currentPath === projectRootPath}
              className="
                px-3 py-1 text-sm font-medium text-vscode-fg
                border border-vscode-border rounded hover:bg-vscode-button-hover
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
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
                transition-colors
                ${!showRecentFiles 
                  ? 'bg-vscode-accent text-white' 
                  : 'text-vscode-fg border border-vscode-border hover:bg-vscode-button-hover'
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
                  transition-colors
                  ${showRecentFiles 
                    ? 'bg-vscode-accent text-white' 
                    : 'text-vscode-fg border border-vscode-border hover:bg-vscode-button-hover'
                  }
                `}
              >
                Recent Files
              </button>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-vscode-fg-muted">
                <div className="animate-spin w-5 h-5 border-2 border-vscode-accent border-t-transparent rounded-full"></div>
                <span>Loading files...</span>
              </div>
            </div>
          ) : showRecentFiles && recentFiles.length > 0 ? (
            <div className="h-full overflow-y-auto">
              <div className="p-2">
                <h3 className="text-sm font-medium text-vscode-fg mb-2">Recent Files</h3>
                {recentFiles.map((filePath, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedFile(filePath)}
                    onDoubleClick={() => handleFileDoubleClick({ name: filePath.split('/').pop() || '', path: filePath, isDirectory: false })}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded cursor-pointer
                      hover:bg-vscode-button-hover transition-colors
                      ${selectedFile === filePath ? 'bg-vscode-accent bg-opacity-20' : ''}
                    `}
                  >
                    <span>{getFileIcon(filePath.split('.').pop() || '')}</span>
                    <span className="text-sm text-vscode-fg">{filePath.split('/').pop()}</span>
                    <span className="text-xs text-vscode-fg-muted ml-auto">{filePath}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-2">
                {filteredFiles.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-vscode-fg-muted">
                    {searchQuery ? 'No files match your search' : 'No files found'}
                  </div>
                ) : (
                  filteredFiles.map((file, index) => (
                    <div
                      key={index}
                      onClick={() => handleFileSelect(file)}
                      onDoubleClick={() => handleFileDoubleClick(file)}
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded cursor-pointer
                        hover:bg-vscode-button-hover transition-colors
                        ${selectedFile === file.path ? 'bg-vscode-accent bg-opacity-20' : ''}
                      `}
                    >
                      <span>{file.isDirectory ? '📁' : getFileIcon(file.name.split('.').pop() || '')}</span>
                      <span className="text-sm text-vscode-fg flex-1">{file.name}</span>
                      {!file.isDirectory && (
                        <span className="text-xs text-vscode-fg-muted">{formatFileSize(file.size)}</span>
                      )}
                    </div>
                  ))
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
        <div className="flex justify-end space-x-3 p-4 border-t border-vscode-border">
          <button
            type="button"
            onClick={handleCancel}
            className="
              px-4 py-2 text-sm font-medium text-vscode-fg
              border border-vscode-border rounded hover:bg-vscode-button-hover
              focus:outline-none focus:ring-2 focus:ring-vscode-accent
              transition-colors
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpen}
            disabled={!selectedFile}
            className="
              px-4 py-2 text-sm font-medium text-white
              bg-vscode-accent hover:bg-vscode-accent-hover
              border border-vscode-accent rounded
              focus:outline-none focus:ring-2 focus:ring-vscode-accent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            Open
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="px-4 pb-3 text-xs text-vscode-fg-muted border-t border-vscode-border">
          <div className="flex justify-between">
            <span>Double-click to open • <kbd className="px-1 bg-vscode-keybinding-bg rounded">Enter</kbd> to open selected</span>
            <span><kbd className="px-1 bg-vscode-keybinding-bg rounded">Esc</kbd> to cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 