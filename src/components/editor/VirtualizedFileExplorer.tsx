// Syntari AI IDE - High-Performance Virtualized File Explorer
// Uses react-window for optimal rendering performance

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { FileNode } from '../../types/fileSystem';
import { fileSystemService } from '../../services/fileSystemService';
import { AlertCircle } from 'lucide-react';

// ================================
// TYPES
// ================================

interface VirtualizedFileExplorerProps {
  rootPath: string;
  selectedPath?: string;
  onFileSelect: (node: FileNode) => void;
  onDirectoryToggle?: (path: string, expanded: boolean) => void;
  height: number;
  className?: string;
}

interface ListItemData {
  nodes: readonly FileNode[];
  selectedPath?: string;
  expandedPaths: Set<string>;
  onFileClick: (node: FileNode) => Promise<void>;
  onDirectoryToggle: (path: string, expanded: boolean) => void;
}

// ================================
// ICON SPRITES (CSS Classes)
// ================================

const ICON_SPRITES = {
  folder: '📁',
  'folder-open': '📂',
  typescript: '🔷',
  tsx: '⚛️',
  javascript: '📄',
  jsx: '⚛️',
  rust: '🦀',
  python: '🐍',
  go: '🐹',
  java: '☕',
  c: '📘',
  cpp: '📘',
  header: '📄',
  csharp: '💜',
  html: '🌐',
  css: '🎨',
  sass: '🎨',
  less: '🎨',
  vue: '💚',
  svelte: '🧡',
  json: '⚙️',
  xml: '📄',
  yaml: '⚙️',
  toml: '⚙️',
  config: '⚙️',
  markdown: '📝',
  text: '📄',
  pdf: '📕',
  image: '🖼️',
  file: '📄'
};

// ================================
// LIST ITEM COMPONENT
// ================================

const FileExplorerItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: ListItemData;
}> = ({ index, style, data }) => {
  const { nodes, selectedPath, expandedPaths, onFileClick, onDirectoryToggle } = data;
  const node = nodes[index];
  
  if (!node) return null;
  
  const isSelected = selectedPath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.isDirectory && node.hasChildren;
  
  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      onDirectoryToggle(node.path, !isExpanded);
    } else {
      onFileClick(node);
    }
  }, [node, isExpanded, onFileClick, onDirectoryToggle]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);
  
  const iconSprite = ICON_SPRITES[node.iconId as keyof typeof ICON_SPRITES] || ICON_SPRITES.file;
  const displayIcon = node.isDirectory ? (isExpanded ? ICON_SPRITES['folder-open'] : ICON_SPRITES.folder) : iconSprite;
  
  return (
    <div
      style={style}
      className={`
        file-explorer-item-virtualized
        ${isSelected ? 'selected' : ''}
        ${node.isDirectory ? 'directory' : 'file'}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={node.isDirectory ? isExpanded : undefined}
    >
      <div 
        className="file-item-content"
        style={{ paddingLeft: `${8 + node.depth * 16}px` }}
      >
        {/* Chevron for directories with children */}
        {hasChildren && (
          <span className="chevron">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        
        {/* File/Directory Icon */}
        <span className="file-icon" role="img" aria-label={node.isDirectory ? 'Directory' : 'File'}>
          {displayIcon}
        </span>
        
        {/* File Name */}
        <span className="file-name" title={node.path}>
          {node.name}
        </span>
        
        {/* File Size (for files only) */}
        {!node.isDirectory && node.size !== undefined && (
          <span className="file-size">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
    </div>
  );
};

// ================================
// HELPER FUNCTIONS
// ================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const buildFlatList = (nodes: readonly FileNode[], expandedPaths: Set<string>): readonly FileNode[] => {
  const result: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();
  
  // Build path-to-node map
  nodes.forEach(node => nodeMap.set(node.path, node));
  
  // Sort nodes by path to ensure proper tree order
  const sortedNodes = [...nodes].sort((a, b) => a.path.localeCompare(b.path));
  
  // Build flat list with proper depth and visibility
  const processNode = (node: FileNode) => {
    result.push(node);
    
    if (node.isDirectory && expandedPaths.has(node.path)) {
      // Add children
      const children = sortedNodes.filter(n => 
        n.path.startsWith(node.path + '/') && 
        n.path.split('/').length === node.path.split('/').length + 1
      );
      
      children.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      children.forEach(child => processNode(child));
    }
  };
  
  // Start with root level nodes
  const rootNodes = sortedNodes.filter(node => node.depth === 0);
  rootNodes.forEach(node => processNode(node));
  
  return result;
};

// VS Code-style error notification component
const FileErrorNotification: React.FC<{ 
  error: string; 
  onDismiss: () => void; 
  type?: 'error' | 'warning' | 'info' 
}> = ({ error, onDismiss, type = 'error' }) => {
  const bgColor = type === 'error' ? 'bg-red-50 border-red-200' : 
                  type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                  'bg-blue-50 border-blue-200';
  const textColor = type === 'error' ? 'text-red-800' : 
                    type === 'warning' ? 'text-yellow-800' : 
                    'text-blue-800';
  const iconColor = type === 'error' ? 'text-red-500' : 
                    type === 'warning' ? 'text-yellow-500' : 
                    'text-blue-500';

  return (
    <div className={`${bgColor} border rounded-md p-4 mb-4 relative`}>
      <div className="flex items-start">
        <AlertCircle className={`${iconColor} h-5 w-5 flex-shrink-0 mt-0.5`} />
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {error}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className={`${textColor} hover:opacity-75 text-lg font-bold leading-none`}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ================================
// MAIN COMPONENT
// ================================

export const VirtualizedFileExplorer: React.FC<VirtualizedFileExplorerProps> = ({
  rootPath,
  selectedPath,
  onFileSelect,
  onDirectoryToggle,
  height,
  className = ''
}) => {
  // State management
  const [nodes, setNodes] = useState<readonly FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([rootPath]));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null); // Separate error for file operations
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  
  // Refs for performance optimization
  const listRef = useRef<List>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Memoized flat list for virtualization
  const flatNodes = useMemo(() => 
    buildFlatList(nodes, expandedPaths), 
    [nodes, expandedPaths]
  );
  
  // Handle directory toggle
  const handleDirectoryToggle = useCallback((path: string, expanded: boolean) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(path);
      } else {
        newSet.delete(path);
        // Also collapse all nested directories
        Array.from(newSet).forEach(expandedPath => {
          if (expandedPath.startsWith(path + '/')) {
            newSet.delete(expandedPath);
          }
        });
      }
      return newSet;
    });
    
    onDirectoryToggle?.(path, expanded);
  }, [onDirectoryToggle]);
  
  // Scan directory with progress updates
  const scanDirectory = useCallback(async (path: string) => {
    // Cancel any ongoing scan
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    setScanProgress({ current: 0, total: 0 });
    
    try {
      const allNodes: FileNode[] = [];
      let chunkCount = 0;
      const startTime = performance.now();
      
      console.log('🚀 Starting VS Code-style progressive scan...');
      console.log('📋 Scan parameters:', {
        path,
        chunkSize: 25,
        ignorePatterns: [],  // Empty array - showing everything
        includeHidden: true
      });
      
      for await (const chunk of fileSystemService.scanDirectory(path, {
        chunkSize: 25,
        ignorePatterns: [],
        includeHidden: true
      })) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('🛑 Scan aborted by user');
          break;
        }
        
        allNodes.push(...chunk);
        chunkCount++;
        
        console.log(`📦 Received chunk ${chunkCount}:`, {
          chunkSize: chunk.length,
          totalNodes: allNodes.length,
          chunkSample: chunk.slice(0, 3).map(n => ({ name: n.name, isDirectory: n.isDirectory, depth: n.depth }))
        });
        
        // Update UI progressively (VS Code style)
        setNodes([...allNodes]);
        setScanProgress({ 
          current: allNodes.length, 
          total: allNodes.length // Total updates as we discover more files
        });
        
        // Log progress for large scans
        if (chunkCount % 10 === 0) {
          const elapsed = performance.now() - startTime;
          console.log(`📊 Chunk ${chunkCount}: ${allNodes.length} files in ${elapsed.toFixed(0)}ms`);
        }
        
        // VS Code-style micro-delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ VS Code-style scan complete: ${allNodes.length} files in ${chunkCount} chunks (${totalTime.toFixed(0)}ms)`);
      
      // Show completion feedback
      if (allNodes.length > 1000) {
        console.log(`🎯 Large project handled: ${allNodes.length} files (VS Code-optimized)`);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        console.error('❌ VS Code-style scan error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initial scan
  useEffect(() => {
    scanDirectory(rootPath);
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [rootPath, scanDirectory]);
  
  // Scroll to selected item
  useEffect(() => {
    if (selectedPath && listRef.current) {
      const index = flatNodes.findIndex(node => node.path === selectedPath);
      if (index !== -1) {
        listRef.current.scrollToItem(index, 'smart');
      }
    }
  }, [selectedPath, flatNodes]);
  
  // Handle file click with VS Code-style error handling
  const handleFileClick = useCallback(async (node: FileNode) => {
    if (node.isDirectory) {
      setExpandedPaths(prev => {
        const newSet = new Set(prev);
        newSet.add(node.path);
        return newSet;
      });
      return;
    }

    try {
      setFileError(null); // Clear any previous file errors
      console.log('📖 Opening file:', node.path);
      
      // Call the backend directly since readFile is not in the service
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        success: boolean;
        data?: string;
        error?: string;
      }>('read_file', { path: node.path });
      
      if (result.success && result.data !== undefined) {
        onFileSelect?.(node);
      } else {
        // Display the friendly error message from the backend
        setFileError(result.error || 'Failed to open file');
        console.error('Failed to read file:', result.error);
      }
    } catch (err) {
      // Fallback error handling
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setFileError(`Unable to open file: ${errorMessage}`);
      console.error('File operation error:', err);
    }
  }, [onFileSelect]);

  // Prepare data for list items
  const listItemData: ListItemData = useMemo(() => ({
    nodes: flatNodes,
    selectedPath,
    expandedPaths,
    onFileClick: handleFileClick,
    onDirectoryToggle: handleDirectoryToggle
  }), [flatNodes, selectedPath, expandedPaths, handleFileClick, handleDirectoryToggle]);
  
  return (
    <div className={`virtualized-file-explorer ${className}`}>
      {/* Header */}
      <div className="file-explorer-header">
        <div className="flex items-center justify-between">
          <span className="font-medium">Explorer</span>
          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
              <span>{scanProgress.current} files</span>
            </div>
          )}
        </div>
      </div>
      
      {/* File Operation Error Display */}
      {fileError && (
        <FileErrorNotification
          error={fileError}
          onDismiss={() => setFileError(null)}
          type="error"
        />
      )}
      
      {/* Scanning Error Display */}
      {error && (
        <FileErrorNotification
          error={error}
          onDismiss={() => scanDirectory(rootPath)}
          type="warning"
        />
      )}
      
      {/* Virtualized List */}
      <div className="file-list-container">
        {flatNodes.length > 0 ? (
          <List
            ref={listRef}
            height={height - 60} // Account for header
            width="100%" // Add required width property
            itemCount={flatNodes.length}
            itemSize={24} // Height per item in pixels
            itemData={listItemData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
            className="file-list"
          >
            {FileExplorerItem}
          </List>
        ) : !isLoading ? (
          <div className="empty-state">
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">📁</div>
              <div className="text-sm">No files found</div>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Footer with stats */}
      <div className="file-explorer-footer">
        <div className="text-xs text-gray-400">
          {flatNodes.length} items
          {isLoading && ' (scanning...)'}
        </div>
      </div>
    </div>
  );
}; 