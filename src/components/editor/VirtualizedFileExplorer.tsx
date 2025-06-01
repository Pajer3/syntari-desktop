// Syntari AI IDE - High-Performance Virtualized File Explorer
// Uses react-window for optimal rendering performance

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { FileNode } from '../../types/fileSystem';
import { fileSystemService } from '../../services/fileSystemService';

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
  onFileSelect: (node: FileNode) => void;
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
  const { nodes, selectedPath, expandedPaths, onFileSelect, onDirectoryToggle } = data;
  const node = nodes[index];
  
  if (!node) return null;
  
  const isSelected = selectedPath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.isDirectory && node.hasChildren;
  
  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      onDirectoryToggle(node.path, !isExpanded);
    } else {
      onFileSelect(node);
    }
  }, [node, isExpanded, onFileSelect, onDirectoryToggle]);
  
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
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  
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
      
      for await (const chunk of fileSystemService.scanDirectory(path, {
        chunkSize: 50, // Smaller chunks for better responsiveness
        ignorePatterns: ['.git', 'node_modules', '.DS_Store', 'target', '.next', 'dist', 'build'],
        includeHidden: false
      })) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        allNodes.push(...chunk);
        chunkCount++;
        
        // Update UI progressively
        setNodes([...allNodes]);
        setScanProgress({ current: allNodes.length, total: allNodes.length });
        
        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      console.log(`📁 Scanned ${allNodes.length} files/directories in ${chunkCount} chunks`);
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        console.error('File scan error:', err);
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
  
  // Prepare data for list items
  const listItemData: ListItemData = useMemo(() => ({
    nodes: flatNodes,
    selectedPath,
    expandedPaths,
    onFileSelect,
    onDirectoryToggle: handleDirectoryToggle
  }), [flatNodes, selectedPath, expandedPaths, onFileSelect, handleDirectoryToggle]);
  
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
      
      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="text-red-400 text-xs">⚠ {error}</span>
          <button 
            onClick={() => scanDirectory(rootPath)}
            className="text-blue-400 text-xs hover:underline"
          >
            Retry
          </button>
        </div>
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