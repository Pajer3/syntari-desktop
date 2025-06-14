// Syntari AI IDE - Unified File Explorer
// Smart component that chooses between regular and virtualized rendering

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { FileNode } from '../../types/fileSystem';
import { fileSystemService } from '../../services/fileSystemService';
import { AlertCircle, Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useFileExplorerWatcher } from '../../hooks/useFileSystemWatcher';
import { EnhancedFileIcon } from '../ui/EnhancedFileIcon';
import { useContextMenu, fileContextMenu } from '../ui/ContextMenu';

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
  // VS Code-style toolbar actions
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onRefresh?: () => void;
  onCollapseAll?: () => void;
  // Ref for external refresh triggers
  refreshRef?: React.RefObject<() => void>;
}

interface ListItemData {
  nodes: readonly FileNode[];
  selectedPath?: string;
  expandedPaths: Set<string>;
  onFileClick: (node: FileNode) => Promise<void>;
  onDirectoryToggle: (path: string, expanded: boolean) => Promise<void>;
  onScrollToItem?: (index: number) => void;
  onFileOperations?: {
    onOpen?: (path: string) => void;
    onCut?: (path: string) => void;
    onCopy?: (path: string) => void;
    onPaste?: (targetPath: string) => void;
    onRename?: (path: string) => void;
    onDelete?: (path: string) => void;
    onProperties?: (path: string) => void;
    onOpenWith?: (path: string, application: string) => void;
  };
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
    onScrollToItem, onFileOperations
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
        onFileOperations={onFileOperations}
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
  onFileOperations?: {
    onOpen?: (path: string) => void;
    onCut?: (path: string) => void;
    onCopy?: (path: string) => void;
    onPaste?: (targetPath: string) => void;
    onRename?: (path: string) => void;
    onDelete?: (path: string) => void;
    onProperties?: (path: string) => void;
    onOpenWith?: (path: string, application: string) => void;
  };
}> = ({ 
  node, selectedPath, expandedPaths, onFileClick, onDirectoryToggle,
  onScrollToItem, index, onFileOperations 
}) => {
  const { showMenu } = useContextMenu();
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isSeparator) return; // Don't show context menu for separators
    
    e.preventDefault();
    e.stopPropagation();
    
    const contextMenuItems = fileContextMenu(
      node.path,
      node.isDirectory,
      {
        onOpen: (path) => {
          console.log('Open:', path);
          onFileOperations?.onOpen?.(path);
        },
        onCut: (path) => {
          console.log('Cut:', path);
          onFileOperations?.onCut?.(path);
        },
        onCopy: (path) => {
          console.log('Copy:', path);
          onFileOperations?.onCopy?.(path);
        },
        onPaste: (targetPath) => {
          console.log('Paste to:', targetPath);
          onFileOperations?.onPaste?.(targetPath);
        },
        onRename: (path) => {
          console.log('Rename:', path);
          onFileOperations?.onRename?.(path);
        },
        onDelete: (path) => {
          console.log('Delete:', path);
          onFileOperations?.onDelete?.(path);
        },
        onProperties: (path) => {
          console.log('Properties:', path);
          onFileOperations?.onProperties?.(path);
        },
        onOpenWith: (path, application) => {
          console.log('Open with:', application, path);
          onFileOperations?.onOpenWith?.(path, application);
        }
      }
    );
    
    showMenu(contextMenuItems, { x: e.clientX, y: e.clientY });
  }, [node, isSeparator, onFileOperations, showMenu]);
  
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
      onContextMenu={handleContextMenu}
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
  onFileOperations?: {
    onOpen?: (path: string) => void;
    onCut?: (path: string) => void;
    onCopy?: (path: string) => void;
    onPaste?: (targetPath: string) => void;
    onRename?: (path: string) => void;
    onDelete?: (path: string) => void;
    onProperties?: (path: string) => void;
    onOpenWith?: (path: string, application: string) => void;
  };
}> = ({
  nodes, selectedPath, expandedPaths, loadedChildren,
  onFileClick, onDirectoryToggle, depth = 0, onFileOperations
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
            onFileOperations={onFileOperations}
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
              onFileOperations={onFileOperations}
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
  draftFiles = [],
  onNewFile,
  onNewFolder,
  onRefresh,
  onCollapseAll,
  refreshRef
}) => {
  console.log('🔄 [DEBUG] FileExplorer component mounted/remounted with rootPath:', rootPath);
  
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
      
      // Only clear state if explicitly requested AND it's the initial load
      // This preserves expanded folders during refresh operations
      if (!preserveState && isInitialLoading) {
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

  // Handle collapse all functionality
  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set());
    setLoadedChildren(new Map());
    onCollapseAll?.();
  }, [onCollapseAll]);

  // Expose refresh function through ref
  React.useImperativeHandle(refreshRef, () => () => {
    console.log('🔄 [DEBUG] External refresh triggered via ref');
    fileSystemService.invalidateAllCaches();
    
    // Refresh root items
    loadRootItems(undefined, true, true); // Preserve state, silent refresh
    
    // Also refresh all expanded directories to pick up new files
    const refreshExpandedDirectories = async () => {
      console.log('🔄 [DEBUG] Refreshing expanded directories:', Array.from(expandedPaths));
      const newLoadedChildren = new Map(loadedChildren);
      
      for (const expandedPath of expandedPaths) {
        try {
          console.log('🔄 [DEBUG] Refreshing directory:', expandedPath);
          const children = await fileSystemService.loadFolderContents(expandedPath, true);
          newLoadedChildren.set(expandedPath, children);
          console.log('🔄 [DEBUG] Refreshed directory contents:', expandedPath, children.length, 'items');
        } catch (error) {
          console.error('🔄 [DEBUG] Failed to refresh directory:', expandedPath, error);
        }
      }
      
      setLoadedChildren(newLoadedChildren);
    };
    
    // Refresh expanded directories after a small delay to ensure root is loaded first
    setTimeout(refreshExpandedDirectories, 100);
  }, [loadRootItems, expandedPaths, loadedChildren]);
  
  // File operations handlers
  const fileOperations = useMemo(() => ({
    onOpen: (path: string) => {
      console.log('📂 Opening file:', path);
      // Find the node and trigger file selection
      const findNode = (nodes: readonly FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.path === path) return node;
          if (node.isDirectory) {
            const children = loadedChildren.get(node.path) || [];
            const found = findNode(children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const node = findNode(allRootNodes);
      if (node && !node.isDirectory) {
        handleFileClick(node);
      }
    },
    onCut: (path: string) => {
      console.log('✂️ Cut file:', path);
      // TODO: Implement cut functionality
    },
    onCopy: (path: string) => {
      console.log('📋 Copy file:', path);
      // TODO: Implement copy functionality
    },
    onPaste: (targetPath: string) => {
      console.log('📄 Paste to:', targetPath);
      // TODO: Implement paste functionality
    },
    onRename: (path: string) => {
      console.log('✏️ Rename file:', path);
      // TODO: Implement rename functionality
    },
    onDelete: (path: string) => {
      console.log('🗑️ Delete file:', path);
      // TODO: Implement delete functionality
    },
    onProperties: (path: string) => {
      console.log('⚙️ Show properties for:', path);
      // TODO: Implement properties dialog
    },
    onOpenWith: (path: string, application: string) => {
      console.log('🔧 Open with', application, ':', path);
      // TODO: Implement open with functionality
    }
  }), [allRootNodes, loadedChildren, handleFileClick]);

  // Prepare data for virtualized list
  const listItemData: ListItemData = useMemo(() => ({
    nodes: shouldUseVirtualization ? filteredNodes : [],
    selectedPath,
    expandedPaths,
    onFileClick: handleFileClick,
    onDirectoryToggle: handleDirectoryToggle,
    onScrollToItem: scrollToItem,
    onFileOperations: fileOperations
  }), [
    shouldUseVirtualization, filteredNodes, selectedPath, expandedPaths, 
    handleFileClick, handleDirectoryToggle, scrollToItem, fileOperations
  ]);
  
  // Initial load
  useEffect(() => {
    loadRootItems(undefined, false);
    return () => abortControllerRef.current?.abort();
  }, [rootPath, loadRootItems]);
  
  // Listen for external refresh triggers (like when files are created)
  useEffect(() => {
    console.log('🔄 [DEBUG] FileExplorer rootPath or key changed, reloading...', { rootPath });
    if (rootPath) {
      // Refresh but preserve expanded state to avoid collapsing folders
      loadRootItems(undefined, true, false);
    }
  }, [rootPath, loadRootItems]);
  
  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔄 [DEBUG] FileExplorer component unmounting...');
      abortControllerRef.current?.abort();
    };
  }, []);
  
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
        <div className="flex items-center space-x-2">
          <span>Explorer {shouldUseVirtualization && '(Virtualized)'}</span>
          {fileWatcher.isWatching && (
            <div className="flex items-center text-green-400">
              <div className="w-1.5 h-1.5 bg-current rounded-full mr-1" />
              <span className="text-xs normal-case">Live</span>
            </div>
          )}
        </div>
        
        {/* VS Code-style action icons */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => onNewFile?.()}
            className="
              p-1.5 hover:bg-gray-700/60 rounded-sm
              text-gray-400 hover:text-gray-100
              transition-all duration-150
              focus:outline-none focus:ring-1 focus:ring-blue-500/30
            "
            title="New File (Ctrl+N)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 1.1l3.4 3.5.1.4v8l-.5.5H3.5l-.5-.5V2l.5-.5h5.5l.5.6zM3 2v11h10V5H9.5L9 4.5V2H3zm7 2h2l-2-2v2z"/>
            </svg>
          </button>
          
          <button
            onClick={() => onNewFolder?.()}
            className="
              p-1.5 hover:bg-gray-700/60 rounded-sm
              text-gray-400 hover:text-gray-100
              transition-all duration-150
              focus:outline-none focus:ring-1 focus:ring-blue-500/30
            "
            title="New Folder (Ctrl+Shift+N)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.71 3h6.79l.5.5v8l-.5.5H2.5l-.5-.5v-10l.5-.5h4.5l.71.71zm-.21 1L6.79 3H2v10h12V4H7.5z"/>
              <path d="M7 6h1v2h2v1H8v2H7V9H5V8h2V6z"/>
            </svg>
          </button>
          
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              // Clear all caches first
              fileSystemService.invalidateAllCaches();
              // Refresh but preserve expanded folders for better UX
              loadRootItems(undefined, true, false);
              // Also call the external refresh callback if provided
              onRefresh?.();
            }}
            className={`
              p-1.5 hover:bg-gray-700/60 rounded-sm
              text-gray-400 hover:text-gray-100
              transition-all duration-150
              focus:outline-none focus:ring-1 focus:ring-blue-500/30
              ${isInitialLoading ? 'animate-spin' : ''}
            `}
            title="Refresh Explorer (F5)"
            disabled={isInitialLoading}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 1A7.5 7.5 0 0 1 16 8.5a.5.5 0 0 1-1 0A6.5 6.5 0 0 0 8.5 2 6.39 6.39 0 0 0 2.6 4.4L.5 2.3A.5.5 0 0 1 1 1.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.85.35L1.5 3.2A7.39 7.39 0 0 1 8.5 1zM1 8.5A6.5 6.5 0 0 0 8.5 15 6.39 6.39 0 0 0 14.4 12.6l2.1 2.1a.5.5 0 0 1-.35.85h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .85-.35l2.15 2.15A7.39 7.39 0 0 1 8.5 16 7.5 7.5 0 0 1 1 8.5a.5.5 0 0 1 1 0z"/>
            </svg>
          </button>
          
          <button
            onClick={handleCollapseAll}
            className="
              p-1.5 hover:bg-gray-700/60 rounded-sm
              text-gray-400 hover:text-gray-100
              transition-all duration-150
              focus:outline-none focus:ring-1 focus:ring-blue-500/30
            "
            title="Collapse All Folders"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9zM3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9z"/>
              <path d="M5.5 6a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
        </div>
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
                onFileOperations={fileOperations}
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