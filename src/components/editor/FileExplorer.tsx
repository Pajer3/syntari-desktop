// Syntari AI IDE - Unified File Explorer
// Smart component that chooses between regular and virtualized rendering

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { FileNode } from '../../types/fileSystem';
import { fileSystemService } from '../../services/fileSystemService';
import { AlertCircle, Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useFileExplorerWatcher } from '../../hooks/useFileSystemWatcher';
import { EnhancedFileIcon } from '../ui/EnhancedFileIcon';

// ================================
// TYPES & INTERFACES
// ================================

interface FileExplorerProps {
  rootPath: string;
  selectedPath?: string;
  onFileSelect: (node: FileNode) => void;
  onDirectoryToggle?: (path: string, expanded: boolean) => void;
  height?: number;
  className?: string;
  forceVirtualization?: boolean; // Override automatic detection
  draftFiles?: Array<{ path: string; name: string; isModified: boolean }>; // New prop for draft files
}

interface ListItemData {
  nodes: readonly FileNode[];
  selectedPath?: string;
  expandedPaths: Set<string>;
  onFileClick: (node: FileNode) => Promise<void>;
  onDirectoryToggle: (path: string, expanded: boolean) => Promise<void>;
  onScrollToItem?: (index: number) => void;
}

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

// Build flat list for virtualization with proper depth tracking
const buildFlatList = (
  nodes: readonly FileNode[], 
  expandedPaths: Set<string>,
  loadedChildren: Map<string, FileNode[]>
): readonly FileNode[] => {
  const result: FileNode[] = [];
  
  const processNode = (node: FileNode, depth: number = 0) => {
    const nodeWithDepth = { ...node, depth };
    result.push(nodeWithDepth);
    
    if (node.isDirectory && expandedPaths.has(node.path)) {
      const children = loadedChildren.get(node.path) || [];
      children.forEach(child => processNode(child, depth + 1));
    }
  };
  
  nodes.forEach(node => processNode(node));
  return result;
};

// ================================
// FILE ITEM COMPONENTS
// ================================

// Virtualized item component
const VirtualizedFileItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: ListItemData;
}> = ({ index, style, data }) => {
  const { 
    nodes, selectedPath, expandedPaths, onFileClick, onDirectoryToggle,
    onScrollToItem
  } = data;
  const node = nodes[index];
  
  if (!node) return null;
  
  return (
    <div style={style}>
      <FileItemContent
        node={node}
        selectedPath={selectedPath}
        expandedPaths={expandedPaths}
        onFileClick={onFileClick}
        onDirectoryToggle={onDirectoryToggle}
        onScrollToItem={onScrollToItem}
        index={index}
      />
    </div>
  );
};

// Shared file item content
const FileItemContent: React.FC<{
  node: FileNode;
  selectedPath?: string;
  expandedPaths: Set<string>;
  onFileClick: (node: FileNode) => Promise<void>;
  onDirectoryToggle: (path: string, expanded: boolean) => Promise<void>;
  onScrollToItem?: (index: number) => void;
  index?: number;
}> = ({ 
  node, selectedPath, expandedPaths, onFileClick, onDirectoryToggle,
  onScrollToItem, index 
}) => {
  const isSelected = selectedPath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.isDirectory && node.hasChildren;
  const isDraft = (node as any).isDraft;
  const isModified = (node as any).isModified;
  const isSeparator = (node as any).isSeparator;
  
  const handleClick = useCallback(async () => {
    if (isSeparator) return; // Don't handle separator clicks
    
    if (node.isDirectory) {
      await onDirectoryToggle(node.path, !isExpanded);
      // Smart scrolling for virtualized lists
      if (!isExpanded && onScrollToItem && index !== undefined) {
        setTimeout(() => onScrollToItem(index), 100);
      }
    } else {
      await onFileClick(node);
    }
  }, [node, isExpanded, onFileClick, onDirectoryToggle, onScrollToItem, index, isSeparator]);
  
  // Handle separator display
  if (isSeparator) {
    return (
      <div className="flex items-center justify-center py-2 text-gray-400 text-xs border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-px bg-gray-600"></div>
          <span className="uppercase tracking-wide font-medium">UNSAVED FILES</span>
          <div className="w-8 h-px bg-gray-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={`
        group flex items-center cursor-pointer select-none
        transition-all duration-150 ease-out
        hover:bg-gray-800/60
        ${isSelected 
          ? 'bg-blue-600/90 text-white' 
          : isDraft 
            ? 'text-orange-400' // Draft files in orange
            : 'text-gray-300'
        }
        ${node.isDirectory ? 'font-medium' : 'font-normal'}
        ${isDraft ? 'italic' : ''}
      `}
      onClick={handleClick}
      title={isDraft ? `${node.path} (unsaved)` : node.path}
    >
      <div 
        className="flex items-center w-full py-1 px-2"
        style={{ 
          paddingLeft: `${8 + (node.depth || 0) * 16}px`
        }}
      >
        {/* Chevron for directories */}
        {node.isDirectory ? (
          <div className="w-4 h-4 mr-1 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )
            ) : (
              <div className="w-3 h-3" />
            )}
          </div>
        ) : (
          <div className="w-4 h-4 mr-1" />
        )}
        
        {/* File/Directory Icon */}
        <div className="mr-2 flex-shrink-0">
          <EnhancedFileIcon 
            fileName={node.name}
            isDirectory={node.isDirectory}
            isOpen={isExpanded}
            size={16}
            className={`opacity-90 ${isDraft ? 'opacity-70' : ''}`}
          />
        </div>
        
        {/* File Name */}
        <span className="flex-1 truncate text-sm leading-tight">
          {node.name}
          {isDraft && isModified && (
            <span className="ml-1 text-yellow-400">●</span>
          )}
        </span>
        
        {/* Draft indicator */}
        {isDraft && (
          <span className="text-xs text-orange-400 ml-2 opacity-70">
            draft
          </span>
        )}
        
        {/* File Size */}
        {!node.isDirectory && !isDraft && node.size !== undefined && (
          <span className="text-xs text-gray-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
    </div>
  );
};

// Regular tree component for small lists
const FileTree: React.FC<{
  nodes: readonly FileNode[];
  selectedPath?: string;
  expandedPaths: Set<string>;
  loadedChildren: Map<string, FileNode[]>;
  onFileClick: (node: FileNode) => Promise<void>;
  onDirectoryToggle: (path: string, expanded: boolean) => Promise<void>;
  depth?: number;
}> = ({
  nodes, selectedPath, expandedPaths, loadedChildren,
  onFileClick, onDirectoryToggle, depth = 0
}) => {
  return (
    <div>
      {nodes.map((node) => (
        <div key={node.path}>
          <FileItemContent
            node={{ ...node, depth }}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onFileClick={onFileClick}
            onDirectoryToggle={onDirectoryToggle}
          />
          
          {/* Render children if expanded */}
          {node.isDirectory && expandedPaths.has(node.path) && (
            <FileTree
              nodes={loadedChildren.get(node.path) || []}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              loadedChildren={loadedChildren}
              onFileClick={onFileClick}
              onDirectoryToggle={onDirectoryToggle}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Error notification component
const ErrorNotification: React.FC<{ 
  error: string; 
  onDismiss: () => void; 
}> = ({ error, onDismiss }) => (
  <div className="mx-2 my-1 p-2 bg-red-900/50 border border-red-700/50 rounded text-sm text-red-200 flex items-center justify-between">
    <div className="flex items-center">
      <AlertCircle size={16} className="mr-2 flex-shrink-0" />
      <span>{error}</span>
    </div>
    <button
      onClick={onDismiss}
      className="ml-2 text-red-400 hover:text-red-200"
    >
      <X size={14} />
    </button>
  </div>
);

// ================================
// MAIN UNIFIED COMPONENT
// ================================

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath,
  selectedPath,
  onFileSelect,
  onDirectoryToggle,
  height = 400,
  className = '',
  forceVirtualization = false,
  draftFiles = []
}) => {
  // State management
  const [rootNodes, setRootNodes] = useState<readonly FileNode[]>([]);
  const [loadedChildren, setLoadedChildren] = useState<Map<string, FileNode[]>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  
  // Refs
  const listRef = useRef<List>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Create draft file nodes
  const draftNodes = useMemo(() => {
    console.log('📁 [DEBUG] FileExplorer processing draftFiles:', {
      draftFiles,
      draftFilesLength: draftFiles.length,
      draftPaths: draftFiles.map(f => f.path)
    });
    
    return draftFiles
      .filter(draft => draft.path.startsWith('<unsaved>/')) // Only show truly unsaved files
      .map(draft => ({
        path: draft.path,
        name: draft.name,
        isDirectory: false,
        hasChildren: false,
        size: 0,
        lastModified: Date.now(),
        depth: 0,
        isDraft: true,
        isModified: draft.isModified
      } as FileNode & { isDraft: boolean; isModified: boolean }));
  }, [draftFiles]);

  // Combine draft files with regular files
  const allRootNodes = useMemo(() => {
    console.log('📁 [DEBUG] FileExplorer allRootNodes:', {
      draftNodesLength: draftNodes.length,
      rootNodesLength: rootNodes.length,
      allNodesLength: draftNodes.length + rootNodes.length + (draftNodes.length > 0 ? 1 : 0)
    });
    
    if (draftNodes.length === 0) return rootNodes;
    
    return [
      ...draftNodes,
      ...(draftNodes.length > 0 ? [{ 
        path: '__separator__', 
        name: 'separator', 
        isDirectory: false, 
        hasChildren: false, 
        size: 0, 
        lastModified: 0,
        depth: 0,
        isSeparator: true 
      } as FileNode & { isSeparator: boolean }] : []),
      ...rootNodes
    ];
  }, [draftNodes, rootNodes]);
  
  // Load root items
  const loadRootItems = useCallback(async (path?: string, preserveState = true, silent = false) => {
    const targetPath = path || rootPath;
    
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    if (!silent && !preserveState) {
      setIsInitialLoading(true);
    }
    setError(null);
    
    try {
      const rootItems = await fileSystemService.loadRootItems(targetPath, true);
      setRootNodes(rootItems);
      
      if (!preserveState) {
        setLoadedChildren(new Map());
        setExpandedPaths(new Set());
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(`Failed to load files: ${err.message}`);
      }
    } finally {
      if (!silent && !preserveState) {
        setIsInitialLoading(false);
      }
    }
  }, [rootPath]);
  
  // File system watcher
  const fileWatcher = useFileExplorerWatcher(rootPath, useCallback(() => {
    loadRootItems(undefined, true, true);
  }, [loadRootItems]));
  
  // Build display list
  const flatNodes = useMemo(() => 
    buildFlatList(allRootNodes, expandedPaths, loadedChildren), 
    [allRootNodes, expandedPaths, loadedChildren, fileWatcher.refreshTrigger]
  );
  
  // Smart rendering decision
  const shouldUseVirtualization = forceVirtualization || flatNodes.length > 100;
  
  // Directory toggle handler
  const handleDirectoryToggle = useCallback(async (path: string, shouldExpand: boolean) => {
    // Don't allow toggling draft files or separators
    if (path.startsWith('<unsaved>/') || path === '__separator__') return;
    
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (shouldExpand) {
        newSet.add(path);
      } else {
        newSet.delete(path);
        // Collapse nested directories
        Array.from(newSet).forEach(expandedPath => {
          if (expandedPath.startsWith(path + '/')) {
            newSet.delete(expandedPath);
          }
        });
      }
      return newSet;
    });
    
    // Load children if expanding
    if (shouldExpand && !loadedChildren.has(path)) {
      try {
        const children = await fileSystemService.loadFolderContents(path, true);
        setLoadedChildren(prev => new Map(prev).set(path, children));
      } catch (err) {
        setError(`Failed to load folder: ${err}`);
      }
    }
    
    onDirectoryToggle?.(path, shouldExpand);
  }, [loadedChildren, onDirectoryToggle]);
  
  // File click handler
  const handleFileClick = useCallback(async (node: FileNode) => {
    // Don't allow clicking separators
    if ((node as any).isSeparator) return;
    
    try {
      setError(null);
      onFileSelect?.(node);
    } catch (err) {
      setError(`Unable to open file: ${err}`);
    }
  }, [onFileSelect]);
  
  // Scroll to item function (for virtualized lists)
  const scrollToItem = useCallback((index: number) => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, 'smart');
    }
  }, []);
  
  // Search functionality
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim() || !isSearchMode) {
      return shouldUseVirtualization ? flatNodes : allRootNodes;
    }
    
    const query = searchQuery.toLowerCase();
    return flatNodes.filter(node => 
      node.name.toLowerCase().includes(query) && !(node as any).isSeparator
    );
  }, [flatNodes, allRootNodes, searchQuery, isSearchMode, shouldUseVirtualization]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearchMode(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
  };
  
  // Prepare data for virtualized list
  const listItemData: ListItemData = useMemo(() => ({
    nodes: shouldUseVirtualization ? filteredNodes : [],
    selectedPath,
    expandedPaths,
    onFileClick: handleFileClick,
    onDirectoryToggle: handleDirectoryToggle,
    onScrollToItem: scrollToItem
  }), [
    shouldUseVirtualization, filteredNodes, selectedPath, expandedPaths, 
    handleFileClick, handleDirectoryToggle, scrollToItem
  ]);
  
  // Initial load
  useEffect(() => {
    loadRootItems(undefined, false);
    return () => abortControllerRef.current?.abort();
  }, [rootPath, loadRootItems]);
  
  // Scroll to selected item (virtualized lists only)
  useEffect(() => {
    if (selectedPath && shouldUseVirtualization && listRef.current) {
      const index = filteredNodes.findIndex(node => node.path === selectedPath);
      if (index !== -1) {
        listRef.current.scrollToItem(index, 'smart');
      }
    }
  }, [selectedPath, filteredNodes, shouldUseVirtualization]);
  
  // ================================
  // RENDER
  // ================================
  
  return (
    <div className={`h-full flex flex-col bg-gray-900 text-gray-300 ${className}`}>
      {/* Loading indicator */}
      {isInitialLoading && (
        <div className="h-0.5 bg-blue-500 animate-pulse" />
      )}
      
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wide">
        <span>Explorer {shouldUseVirtualization && '(Virtualized)'}</span>
        {fileWatcher.isWatching && (
          <div className="flex items-center text-green-400">
            <div className="w-1.5 h-1.5 bg-current rounded-full mr-1" />
            <span className="text-xs normal-case">Live</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-700/50">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-7 pr-7 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      
      {/* Error display */}
      {error && <ErrorNotification error={error} onDismiss={() => setError(null)} />}
      
      {/* File list - Smart rendering */}
      <div className="flex-1 overflow-hidden">
        {filteredNodes.length > 0 ? (
          shouldUseVirtualization || isSearchMode ? (
            // Virtualized rendering for large lists or search results
            <List
              ref={listRef}
              height={height - 80}
              width="100%"
              itemCount={filteredNodes.length}
              itemSize={22}
              itemData={listItemData}
              overscanCount={10}
              className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
            >
              {VirtualizedFileItem}
            </List>
          ) : (
            // Regular tree rendering for small lists
            <div 
              className="overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
              style={{ height: height - 80 }}
            >
              <FileTree
                nodes={allRootNodes}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                loadedChildren={loadedChildren}
                onFileClick={handleFileClick}
                onDirectoryToggle={handleDirectoryToggle}
              />
            </div>
          )
        ) : !isInitialLoading && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">
                {isSearchMode ? '🔍' : '📁'}
              </div>
              <div className="text-sm">
                {isSearchMode ? 'No search results' : 'No files found'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-3 py-1 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between">
        <span>
          {isSearchMode ? 
            `${filteredNodes.length} result${filteredNodes.length !== 1 ? 's' : ''}` :
            `${filteredNodes.length} items`
          }
        </span>
        {fileWatcher.isWatching && (
          <span className="text-green-500">Live</span>
        )}
      </div>
    </div>
  );
};

export default FileExplorer; 