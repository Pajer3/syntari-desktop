// Syntari AI IDE - VS Code-Style Lazy File Explorer
// Instant loading with on-demand folder expansion

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
  onDirectoryToggle: (path: string, expanded: boolean) => Promise<void>;
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

// Build flat list for virtualization with lazy loading
const buildFlatList = (
  nodes: readonly FileNode[], 
  expandedPaths: Set<string>,
  loadedChildren: Map<string, FileNode[]>
): readonly FileNode[] => {
  const result: FileNode[] = [];
  
  const processNode = (node: FileNode) => {
    result.push(node);
    
    if (node.isDirectory && expandedPaths.has(node.path)) {
      // Add children if they're loaded
      const children = loadedChildren.get(node.path) || [];
      children.forEach(child => processNode(child));
    }
  };
  
  // Process all root nodes
  nodes.forEach(node => processNode(node));
  
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
  const [rootNodes, setRootNodes] = useState<readonly FileNode[]>([]);
  const [loadedChildren, setLoadedChildren] = useState<Map<string, FileNode[]>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [folderLoadingPaths, setFolderLoadingPaths] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Refs for performance optimization
  const listRef = useRef<List>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Memoized flat list for virtualization
  const flatNodes = useMemo(() => 
    buildFlatList(rootNodes, expandedPaths, loadedChildren), 
    [rootNodes, expandedPaths, loadedChildren]
  );
  
  // VS Code-style instant root loading
  const loadRootItems = useCallback(async (path: string) => {
    // Cancel any ongoing operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setIsInitialLoading(true);
    setLoadError(null);
    
    try {
      console.log('🚀 STEP 1: Starting VS Code instant root load for path:', path);
      console.log('🚀 STEP 1.1: Path type:', typeof path, 'Path length:', path.length);
      
      // Test 1: Direct backend call
      const { invoke } = await import('@tauri-apps/api/core');
      console.log('🚀 STEP 2: Tauri invoke imported successfully');
      
      // Test 2: Try the debug command first
      console.log('🧪 STEP 3: Testing backend connectivity...');
      try {
        const debugResult = await invoke('debug_test_command', { testPath: path });
        console.log('🧪 STEP 4: Debug test result:', debugResult);
      } catch (debugError) {
        console.error('❌ STEP 4 FAILED: Debug test failed:', debugError);
      }
      
      // Test 3: Try load_root_items with detailed logging
      console.log('📁 STEP 5: Calling load_root_items...');
      console.log('📁 STEP 5.1: Parameters:', { rootPath: path, includeHidden: true, showHiddenFolders: true });
      
      const result = await invoke<{
        success: boolean;
        data?: Array<{
          path: string;
          name: string;
          depth: number;
          size: number;
          last_modified: number;
          extension: string;
          is_directory: boolean;
        }>;
        error?: string;
      }>('load_root_items', { 
        rootPath: path,
        includeHidden: true,
        showHiddenFolders: true
      });
      
      console.log('📁 STEP 6: Backend response from load_root_items:', JSON.stringify(result, null, 2));
      console.log('📁 STEP 6.1: Response type check:', {
        isObject: typeof result === 'object',
        hasSuccess: 'success' in result,
        successValue: result.success,
        hasData: 'data' in result,
        dataType: typeof result.data,
        dataLength: result.data?.length,
        hasError: 'error' in result,
        errorValue: result.error
      });
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ STEP 7: Converting backend data to FileNode format...');
        console.log('✅ STEP 7.1: First few items:', result.data.slice(0, 3));
        
        // Use direct backend result instead of fileSystemService
        const rootItems: FileNode[] = result.data.map(item => {
          // Generate stable ID from path hash
          let hash = 0;
          for (let i = 0; i < item.path.length; i++) {
            const char = item.path.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          const id = Math.abs(hash).toString(36);
          
          return {
            id,
            path: item.path,
            name: item.name,
            depth: item.depth,
            isDirectory: item.is_directory,
            size: item.is_directory ? undefined : item.size,
            lastModified: item.last_modified,
            extension: item.extension,
            iconId: item.is_directory ? 'folder' : 'file',
            hasChildren: item.is_directory,
            isExpanded: false,
            children: undefined
          };
        });
        
        console.log(`✅ STEP 8: Successfully converted ${rootItems.length} items`);
        console.log('📊 STEP 9: Items breakdown:', {
          total: rootItems.length,
          directories: rootItems.filter(n => n.isDirectory).length,
          files: rootItems.filter(n => !n.isDirectory).length
        });
        console.log('📊 STEP 9.1: First converted item:', rootItems[0]);
        
        setRootNodes(rootItems);
        setLoadedChildren(new Map());
        setExpandedPaths(new Set());
        
        console.log('✅ STEP 10: State updated successfully!');
        
      } else {
        console.error('❌ STEP 7 FAILED: No data or unsuccessful response');
        console.error('❌ Response details:', {
          success: result.success,
          dataLength: result.data?.length,
          dataExists: !!result.data,
          error: result.error
        });
        
        // More descriptive error message
        let errorMsg = `Failed to load files from: ${path}`;
        if (!result.success) {
          errorMsg += ` - Backend reported failure`;
        }
        if (result.error) {
          errorMsg += ` - Error: ${result.error}`;
        }
        if (!result.data || result.data.length === 0) {
          errorMsg += ` - No files returned`;
        }
        
        setLoadError(errorMsg);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('❌ STEP ERROR: Complete failure in loadRootItems:', err);
        console.error('❌ Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        setLoadError(`Failed to load folder: ${err.message}`);
      }
    } finally {
      setIsInitialLoading(false);
      console.log('🏁 STEP FINAL: Loading process completed');
    }
  }, []);
  
  // VS Code-style lazy folder expansion
  const handleDirectoryToggle = useCallback(async (path: string, shouldExpand: boolean) => {
    console.log(`📁 Folder ${shouldExpand ? 'expand' : 'collapse'}:`, path);
    
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (shouldExpand) {
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
    
    // Load children if expanding and not already loaded
    if (shouldExpand && !loadedChildren.has(path)) {
      setFolderLoadingPaths(prev => new Set(prev).add(path));
      
      try {
        console.log('🔄 Loading folder contents:', path);
      const startTime = performance.now();
      
        const children = await fileSystemService.loadFolderContents(path, true);
        const loadTime = performance.now() - startTime;
        
        console.log(`📦 Loaded ${children.length} items from ${path} in ${loadTime.toFixed(1)}ms`);
        
        setLoadedChildren(prev => new Map(prev).set(path, children));
        
      } catch (error) {
        console.error('Failed to load folder contents:', error);
      } finally {
        setFolderLoadingPaths(prev => {
          const newSet = new Set(prev);
          newSet.delete(path);
          return newSet;
        });
      }
    }
    
    onDirectoryToggle?.(path, shouldExpand);
  }, [loadedChildren, onDirectoryToggle]);
  
  // Initial load when rootPath changes
  useEffect(() => {
    loadRootItems(rootPath);
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [rootPath, loadRootItems]);
  
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
      await handleDirectoryToggle(node.path, !expandedPaths.has(node.path));
      return;
    }

    try {
      setFileError(null);
      console.log('📖 Opening file:', node.path);
      
      // Call the backend directly for file reading
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        success: boolean;
        data?: string;
        error?: string;
      }>('read_file', { path: node.path });
      
      if (result.success && result.data !== undefined) {
        onFileSelect?.(node);
      } else {
        setFileError(result.error || 'Failed to open file');
        console.error('Failed to read file:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setFileError(`Unable to open file: ${errorMessage}`);
      console.error('File operation error:', err);
    }
  }, [expandedPaths, handleDirectoryToggle, onFileSelect]);

  // Prepare data for list items
  const listItemData: ListItemData = useMemo(() => ({
    nodes: flatNodes,
    selectedPath,
    expandedPaths,
    onFileClick: handleFileClick,
    onDirectoryToggle: handleDirectoryToggle
  }), [flatNodes, selectedPath, expandedPaths, handleFileClick, handleDirectoryToggle]);
  
  return (
    <div className={`file-explorer-virtualized h-full relative ${className}`}>
      {/* SINGLE Professional Loading Overlay - only for initial load */}
      {isInitialLoading && (
        <div className="absolute inset-0 z-50 bg-vscode-bg/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            {/* Animated VS Code-style loader */}
            <div className="relative mb-4">
              <div className="w-12 h-12 border-3 border-vscode-accent/30 border-t-vscode-accent rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-8 h-8 border-2 border-vscode-accent/20 border-t-transparent rounded-full animate-spin mx-auto mt-2 ml-2"></div>
            </div>
            
            {/* Progress text */}
            <div className="text-vscode-fg text-sm font-medium mb-2">
              Loading Project Root
            </div>
            
            {/* Scanning indicator */}
            <div className="text-vscode-fg-muted text-xs">
              Instant VS Code-style loading...
            </div>
            
            {/* VS Code style progress dots */}
            <div className="flex justify-center mt-3 space-x-1">
              <div className="w-2 h-2 bg-vscode-accent rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-vscode-accent/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-vscode-accent/30 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* File Explorer Header */}
      <div className="file-explorer-header px-3 py-2 bg-vscode-sidebar border-b border-vscode-border text-xs font-medium text-vscode-fg flex items-center justify-between">
        <span>EXPLORER</span>
        <div className="flex items-center gap-2">
          {/* Show folder loading indicator in header for ongoing operations */}
          {folderLoadingPaths.size > 0 && (
            <div className="flex items-center text-vscode-accent">
              <div className="w-3 h-3 border border-vscode-accent border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-xs">Loading {folderLoadingPaths.size} folder{folderLoadingPaths.size > 1 ? 's' : ''}...</span>
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
      
      {/* Load Error Display */}
      {loadError && (
        <FileErrorNotification
          error={loadError}
          onDismiss={() => setLoadError(null)}
          type="warning"
        />
      )}
      
      {/* Virtualized List */}
      <div className="file-list-container">
        {flatNodes.length > 0 ? (
          <List
            ref={listRef}
            height={height - 60} // Account for header
            width="100%"
            itemCount={flatNodes.length}
            itemSize={24} // Height per item in pixels
            itemData={listItemData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
            className="file-list"
          >
            {FileExplorerItem}
          </List>
        ) : !isInitialLoading ? (
          <div className="empty-state">
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">📁</div>
              <div className="text-sm">No files found</div>
              <div className="text-xs mt-2 text-gray-500">Try selecting a different folder</div>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Footer with stats */}
      <div className="file-explorer-footer">
        <div className="text-xs text-gray-400">
          {flatNodes.length} items visible
          {isInitialLoading && ' (loading...)'}
          {folderLoadingPaths.size > 0 && ` • ${folderLoadingPaths.size} folder${folderLoadingPaths.size > 1 ? 's' : ''} expanding`}
        </div>
      </div>
    </div>
  );
}; 