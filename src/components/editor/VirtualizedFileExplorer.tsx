// Syntari AI IDE - VS Code-Style Lazy File Explorer
// Instant loading with on-demand folder expansion

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { FileNode } from '../../types/fileSystem';
import { fileSystemService } from '../../services/fileSystemService';
import { AlertCircle, Search, X, Move, Copy } from 'lucide-react';
import { useFileExplorerWatcher } from '../../hooks/useFileSystemWatcher';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FileIcon } from '../ui/FileIcon';

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
  // Drag & Drop
  draggedNode?: FileNode | null;
  dragOverPath?: string | null;
  isDragMode?: boolean;
  onDragStart?: (node: FileNode, e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (path: string, e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (targetPath: string, e: React.DragEvent) => void;
}

// Icons are now handled by the FileIcon component

// ================================
// LIST ITEM COMPONENT
// ================================

const FileExplorerItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: ListItemData;
}> = ({ index, style, data }) => {
  const { 
    nodes, selectedPath, expandedPaths, onFileClick, onDirectoryToggle,
    draggedNode, dragOverPath, isDragMode, onDragStart, onDragEnd, 
    onDragOver, onDragLeave, onDrop 
  } = data;
  const node = nodes[index];
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  
  if (!node) return null;
  
  const isSelected = selectedPath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.isDirectory && node.hasChildren;
  
  // Drag & Drop states
  const isBeingDragged = draggedNode?.path === node.path;
  const isDragTarget = dragOverPath === node.path;
  const canBeDropTarget = node.isDirectory && !isBeingDragged;
  
  const handleClick = useCallback(() => {
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 150);
    
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
  
  return (
    <div
      style={style}
      draggable={!isDragMode || !isBeingDragged}
      onDragStart={(e) => onDragStart?.(node, e)}
      onDragEnd={onDragEnd}
      onDragOver={canBeDropTarget ? (e) => onDragOver?.(node.path, e) : undefined}
      onDragLeave={canBeDropTarget ? onDragLeave : undefined}
      onDrop={canBeDropTarget ? (e) => onDrop?.(node.path, e) : undefined}
      className={`
        group relative flex items-center px-2 py-1 cursor-pointer select-none
        transition-all duration-200 ease-out
        hover:bg-vscode-list-hover
        ${isSelected 
          ? 'bg-vscode-list-active text-white border-l-2 border-vscode-accent' 
          : 'text-vscode-fg hover:text-white'
        }
        ${isClicking ? 'scale-98 bg-vscode-list-active' : ''}
        ${node.isDirectory ? 'font-medium' : 'font-normal'}
        ${isBeingDragged ? 'opacity-50 scale-95 transform rotate-1' : ''}
        ${isDragTarget ? 'bg-blue-500/20 border-l-4 border-blue-400 ring-1 ring-blue-400/50' : ''}
        ${canBeDropTarget && isDragMode ? 'border-dashed border-gray-400/50' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={node.isDirectory ? isExpanded : undefined}
      title={`${node.path}${isDragMode && canBeDropTarget ? ' (Drop zone)' : ''}`}
    >
      <div 
        className="flex items-center w-full transition-all duration-200"
        style={{ 
          paddingLeft: `${8 + node.depth * 16}px`,
          transform: isSelected ? 'translateX(2px)' : 'translateX(0)',
        }}
      >
        {/* Chevron for directories with children */}
        {hasChildren && (
          <span className={`
            inline-flex items-center justify-center w-4 h-4 mr-1
            transition-all duration-200 ease-out
            ${isExpanded ? 'rotate-90' : 'rotate-0'}
            ${isHovered ? 'scale-110' : 'scale-100'}
            text-vscode-fg-muted hover:text-vscode-accent
          `}>
            ▶
          </span>
        )}
        
        {/* Modern File/Directory Icon */}
        <div className={`
          mr-2 transition-all duration-200 ease-out
          ${isSelected || isHovered ? 'scale-110' : 'scale-100'}
        `}>
          <FileIcon 
            fileName={node.name}
            isDirectory={node.isDirectory}
            isOpen={isExpanded}
            size={16}
            className="flex-shrink-0"
          />
        </div>
        
        {/* File Name with smooth highlighting */}
        <span 
          className={`
            flex-1 truncate text-sm transition-all duration-200
            ${isSelected ? 'font-semibold' : 'font-normal'}
            ${isHovered && !isSelected ? 'font-medium' : ''}
          `}
          title={node.path}
        >
          {node.name}
        </span>
        
        {/* File Size with fade-in animation */}
        {!node.isDirectory && node.size !== undefined && (
          <span className={`
            text-xs text-vscode-fg-muted ml-2 transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-60'}
          `}>
            {formatFileSize(node.size)}
          </span>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-vscode-accent animate-pulse" />
        )}

        {/* Hover effect */}
        {isHovered && !isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-vscode-fg-muted opacity-30 transition-opacity duration-200" />
        )}

        {/* Drag & Drop Visual Indicators */}
        {isBeingDragged && (
          <div className="absolute inset-0 bg-blue-500/10 border border-blue-400/50 rounded-sm pointer-events-none">
            <div className="absolute top-1 right-1">
              <Move size={12} className="text-blue-400" />
            </div>
          </div>
        )}
        
        {isDragTarget && canBeDropTarget && (
          <div className="absolute inset-0 bg-green-500/10 border-2 border-dashed border-green-400 rounded-sm pointer-events-none">
            <div className="absolute top-1 right-1 flex items-center space-x-1">
              <Copy size={10} className="text-green-400" />
              <span className="text-xs text-green-400 font-semibold">DROP</span>
            </div>
          </div>
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [folderLoadingPaths, setFolderLoadingPaths] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentlySelectedPath, setCurrentlySelectedPath] = useState<string | null>(selectedPath || null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  
  // Drag & Drop state
  const [draggedNode, setDraggedNode] = useState<FileNode | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState<boolean>(false);
  const [dragOperation, setDragOperation] = useState<'move' | 'copy'>('move');
  
  // Refs for performance optimization
  const listRef = useRef<List>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // VS Code-style instant root loading (moved before file watcher to fix temporal dead zone)
  const loadRootItems = useCallback(async (path?: string, preserveExpandedState = true) => {
    const targetPath = path || rootPath;
    
    // Cancel any ongoing operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setIsInitialLoading(true);
    setLoadError(null);
    
    try {
      console.log('🚀 Starting VS Code instant root load for path:', targetPath);
      
      // Use the centralized service layer
      const rootItems = await fileSystemService.loadRootItems(targetPath, true);
      
      console.log(`✅ Successfully loaded ${rootItems.length} items via service layer`);
      console.log('📊 Items breakdown:', {
        total: rootItems.length,
        directories: rootItems.filter(n => n.isDirectory).length,
        files: rootItems.filter(n => !n.isDirectory).length
      });
      
      setRootNodes(rootItems);
      
      // For auto-refresh, preserve both expanded paths and loaded children
      if (!preserveExpandedState) {
        // Only clear state on initial load or manual refresh
        setLoadedChildren(new Map());
        setExpandedPaths(new Set());
      }
      // For auto-refresh, keep existing loaded children and expanded paths
      
      console.log('✅ State updated successfully!');
        
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('❌ Failed to load root items:', err);
        setLoadError(`Failed to load files from: ${targetPath} - ${err.message}`);
      }
    } finally {
      setIsInitialLoading(false);
      console.log('🏁 Loading process completed');
    }
  }, [rootPath]);
  
  // Live file system watcher for automatic updates
  const fileWatcher = useFileExplorerWatcher(rootPath, useCallback(() => {
    // Force refresh the explorer when files change, but preserve expanded state
    console.log('🔄 File system change detected, refreshing without clearing expanded folders...');
    loadRootItems();
  }, [loadRootItems]));
  
  // Memoized flat list for virtualization
  const flatNodes = useMemo(() => 
    buildFlatList(rootNodes, expandedPaths, loadedChildren), 
    [rootNodes, expandedPaths, loadedChildren, fileWatcher.refreshTrigger]
  );
  
  // VS Code-style lazy folder expansion
  const handleDirectoryToggle = useCallback(async (path: string, shouldExpand: boolean) => {
    const expandedIndex = flatNodes.findIndex(node => node.path === path);
    
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
        
        // Auto-scroll to ensure expanded content is visible
        if (listRef.current && expandedIndex !== -1) {
          setTimeout(() => {
            listRef.current?.scrollToItem(expandedIndex, 'smart');
          }, 50); // Small delay to allow state update
        }
        
      } catch (error) {
        console.error('Failed to load folder contents:', error);
      } finally {
        setFolderLoadingPaths(prev => {
          const newSet = new Set(prev);
          newSet.delete(path);
          return newSet;
        });
      }
    } else if (shouldExpand && listRef.current && expandedIndex !== -1) {
      // Auto-scroll for already loaded content
      setTimeout(() => {
        listRef.current?.scrollToItem(expandedIndex, 'smart');
      }, 50);
    }
    
    onDirectoryToggle?.(path, shouldExpand);
  }, [loadedChildren, onDirectoryToggle, flatNodes]);
  
  // Initial load when rootPath changes
  useEffect(() => {
    loadRootItems(undefined, false); // Clear expanded state on initial load
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [rootPath, loadRootItems]);

  // Note: File system event handling is now managed by useFileExplorerWatcher hook above
  // This provides better debouncing and filtering of events to prevent excessive refreshes
  
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
    // Update selected file for keyboard operations
    setCurrentlySelectedPath(node.path);
    
    if (node.isDirectory) {
      await handleDirectoryToggle(node.path, !expandedPaths.has(node.path));
      return;
    }

    try {
      setFileError(null);
      console.log('📖 Opening file:', node.path);
      
      // Use the centralized service layer for smart file reading
      const fileData = await fileSystemService.readFile(node.path);
      
      if (fileData.isTooLarge) {
        setFileError(`File too large (${(fileData.size / 1024 / 1024).toFixed(1)} MB). Maximum supported size is 256 MB.`);
        return;
      }
      
      if (fileData.shouldUseHexMode) {
        setFileError(`Large file (${(fileData.size / 1024 / 1024).toFixed(1)} MB). Opening in read-only mode for performance.`);
        // Could trigger hex mode in the future
        return;
      }
      
      if (fileData.isBinary) {
        setFileError('Cannot open binary file in text editor');
        return;
      }
      
      if (fileData.warning) {
        // Show warning but still allow opening
        console.warn('File warning:', fileData.warning);
      }
      
      // File is safe to open
      onFileSelect?.(node);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setFileError(`Unable to open file: ${errorMessage}`);
      console.error('File operation error:', err);
    }
  }, [expandedPaths, handleDirectoryToggle, onFileSelect]);

  // ================================
  // DRAG & DROP FUNCTIONALITY
  // ================================

  const handleDragStart = useCallback((node: FileNode, e: React.DragEvent) => {
    console.log('🎯 Drag started:', node.path);
    setDraggedNode(node);
    setIsDragMode(true);
    
    // Set drag data
    e.dataTransfer.setData('text/plain', node.path);
    e.dataTransfer.setData('application/syntari-file', JSON.stringify(node));
    
    // Determine operation based on modifier keys
    const operation = e.ctrlKey ? 'copy' : 'move';
    setDragOperation(operation);
    e.dataTransfer.effectAllowed = operation === 'copy' ? 'copy' : 'move';
    
    // Create drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(5deg)';
    e.dataTransfer.setDragImage(dragImage, 20, 10);
  }, []);

  const handleDragEnd = useCallback(() => {
    console.log('🎯 Drag ended');
    setDraggedNode(null);
    setDragOverPath(null);
    setIsDragMode(false);
    setDragOperation('move');
  }, []);

  const handleDragOver = useCallback((targetPath: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const targetNode = flatNodes.find(node => node.path === targetPath);
    if (!targetNode?.isDirectory) return;
    
    // Don't allow dropping on itself or its children
    if (draggedNode && (
      draggedNode.path === targetPath ||
      targetPath.startsWith(draggedNode.path + '/')
    )) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    setDragOverPath(targetPath);
    e.dataTransfer.dropEffect = dragOperation;
  }, [flatNodes, draggedNode, dragOperation]);

  const handleDragLeave = useCallback(() => {
    setDragOverPath(null);
  }, []);

  const handleDrop = useCallback(async (targetPath: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const targetNode = flatNodes.find(node => node.path === targetPath);
    if (!targetNode?.isDirectory) {
      console.warn('❌ Drop target is not a directory');
      return;
    }
    
    // Handle external file drops from system file manager
    if (e.dataTransfer.files.length > 0) {
      console.log('🌍 External file drop detected:', e.dataTransfer.files.length, 'files');
      await handleExternalFileDrop(targetPath, e.dataTransfer.files);
      return;
    }
    
    // Handle internal drag & drop within the app
    const dragData = e.dataTransfer.getData('application/syntari-file');
    if (!dragData || !draggedNode) return;
    
    const sourceNode = JSON.parse(dragData) as FileNode;
    
    // Don't allow dropping on itself or its children
    if (sourceNode.path === targetPath || targetPath.startsWith(sourceNode.path + '/')) {
      console.warn('❌ Cannot drop item on itself or its children');
      return;
    }
    
    try {
      setFileError(null);
      const fileName = sourceNode.name;
      const newPath = `${targetPath}/${fileName}`;
      
      console.log(`🎯 ${dragOperation === 'copy' ? 'Copying' : 'Moving'} "${sourceNode.path}" to "${newPath}"`);
      
      if (dragOperation === 'copy') {
        // Copy file/directory
        await invoke('copy_file', {
          sourcePath: sourceNode.path,
          targetPath: newPath
        });
        console.log('✅ File copied successfully');
      } else {
        // Move file/directory
        await invoke('move_file', {
          sourcePath: sourceNode.path,
          targetPath: newPath
        });
        console.log('✅ File moved successfully');
      }
      
      // Refresh the file tree
      await loadRootItems();
      
      // Expand target directory to show the moved/copied item
      if (!expandedPaths.has(targetPath)) {
        await handleDirectoryToggle(targetPath, true);
      }
      
    } catch (error) {
      console.error(`❌ Failed to ${dragOperation} file:`, error);
      setFileError(`Failed to ${dragOperation} file: ${error}`);
    } finally {
      handleDragEnd();
    }
  }, [flatNodes, draggedNode, dragOperation, loadRootItems, expandedPaths, handleDirectoryToggle]);

  // Handle external file drops from system file manager
  const handleExternalFileDrop = useCallback(async (targetPath: string, files: FileList) => {
    try {
      setFileError(null);
      console.log(`📂 Dropping ${files.length} external files into: ${targetPath}`);
      
      const fileArray = Array.from(files);
      let successCount = 0;
      let errorCount = 0;
      
      for (const file of fileArray) {
        try {
          // Get the file path from the File object
          // Note: In Tauri, we need to handle this differently than in a regular web app
          const filePath = (file as any).path || file.name;
          const targetFilePath = `${targetPath}/${file.name}`;
          
          console.log(`📋 Copying external file: ${filePath} → ${targetFilePath}`);
          
          // For external drops, always copy (don't move files from outside the project)
          await invoke('copy_file', {
            sourcePath: filePath,
            targetPath: targetFilePath
          });
          
          successCount++;
          console.log(`✅ Successfully copied: ${file.name}`);
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to copy ${file.name}:`, error);
        }
      }
      
      // Show result summary
      if (successCount > 0) {
        console.log(`✅ Successfully copied ${successCount} files`);
        
        // Refresh the file tree
        await loadRootItems();
        
        // Expand target directory to show the new files
        if (!expandedPaths.has(targetPath)) {
          await handleDirectoryToggle(targetPath, true);
        }
      }
      
      if (errorCount > 0) {
        setFileError(`Failed to copy ${errorCount} files. Check console for details.`);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle external file drop:', error);
      setFileError(`Failed to copy external files: ${error}`);
    }
  }, [loadRootItems, expandedPaths, handleDirectoryToggle]);

  // Simple file filtering based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim() || !isSearchMode) {
      return flatNodes;
    }
    
    // Simple text matching for now
    const query = searchQuery.toLowerCase();
    return flatNodes.filter(node => 
      node.name.toLowerCase().includes(query)
    );
  }, [flatNodes, searchQuery, isSearchMode]);

  // Prepare data for list items
  const listItemData: ListItemData = useMemo(() => ({
    nodes: filteredNodes,
    selectedPath,
    expandedPaths,
    onFileClick: handleFileClick,
    onDirectoryToggle: handleDirectoryToggle,
    // Drag & Drop
    draggedNode,
    dragOverPath,
    isDragMode,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  }), [
    filteredNodes, selectedPath, expandedPaths, handleFileClick, handleDirectoryToggle,
    draggedNode, dragOverPath, isDragMode, handleDragStart, handleDragEnd,
    handleDragOver, handleDragLeave, handleDrop
  ]);
  
  // ================================
  // FILE OPERATIONS
  // ================================

  const deleteSelectedFile = useCallback(async () => {
    if (!currentlySelectedPath) {
      setFileError('No file selected for deletion');
      return;
    }

    try {
      console.log('🗑️ Deleting file:', currentlySelectedPath);
      
      // Show confirmation dialog (basic implementation)
      const confirmed = confirm(`Are you sure you want to delete "${currentlySelectedPath}"?`);
      if (!confirmed) return;

      // Call Tauri backend to delete file
      await invoke('delete_file', { path: currentlySelectedPath });
      
      
      
      // Clear selection
      setCurrentlySelectedPath(null);
      
      // Refresh explorer but preserve expanded state
      loadRootItems();
      
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      setFileError(`Failed to delete file: ${error}`);
    }
  }, [currentlySelectedPath, loadRootItems]);

  const forceDeleteSelectedFile = useCallback(async () => {
    if (!currentlySelectedPath) {
      setFileError('No file selected for deletion');
      return;
    }

    try {
      console.log('🗑️ Force deleting file:', currentlySelectedPath);
      
      // Show confirmation dialog for force delete
      const confirmed = confirm(`Force delete "${currentlySelectedPath}"? This cannot be undone.`);
      if (!confirmed) return;

      // Call Tauri backend to force delete file
      await invoke('delete_file', { path: currentlySelectedPath, force: true });
      
      
      
      // Clear selection
      setCurrentlySelectedPath(null);
      
      // Refresh explorer but preserve expanded state
      loadRootItems();
      
    } catch (error) {
      console.error('❌ Failed to force delete file:', error);
      setFileError(`Failed to force delete file: ${error}`);
    }
  }, [currentlySelectedPath, loadRootItems]);

  const refreshFileExplorer = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    
    try {
      // Clear all caches and reload - ONLY for manual refresh
      setLoadedChildren(new Map());
      setExpandedPaths(new Set()); // Only clear expanded paths on manual refresh
      fileSystemService.invalidateCache();
      
      // Reload root items
      await loadRootItems();
      
      console.log('✅ File explorer refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh file explorer:', error);
      setFileError(`Failed to refresh: ${error}`);
    }
  }, [loadRootItems]);

  // ================================
  // SEARCH FUNCTIONALITY
  // ================================

  // Search handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearchMode(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
  };

  // ================================
  // TAURI FILE DROP HANDLER
  // ================================

  // Handle Tauri file drops
  const handleTauriFileDrop = useCallback(async (targetPath: string, filePaths: string[]) => {
    try {
      setFileError(null);
      console.log(`📂 Dropping ${filePaths.length} Tauri files into: ${targetPath}`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const filePath of filePaths) {
        try {
          const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
          const targetFilePath = `${targetPath}/${fileName}`;
          
          console.log(`📋 Copying Tauri file: ${filePath} → ${targetFilePath}`);
          
          // Debug: Log the exact parameters being sent
          const copyParams = {
            sourcePath: filePath,
            targetPath: targetFilePath
          };
          console.log('🔍 Copy parameters (camelCase test):', copyParams);
          
          // For external drops, always copy (don't move files from outside the project)
          // Note: Using camelCase as Tauri v2 might auto-convert to snake_case
          await invoke('copy_file', copyParams);
          
          successCount++;
          console.log(`✅ Successfully copied: ${fileName}`);
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to copy ${filePath}:`, error);
          console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
          console.error(`❌ Error type:`, typeof error);
        }
      }
      
      // Show result summary
      if (successCount > 0) {
        console.log(`✅ Successfully copied ${successCount} files via Tauri`);
        
        // Refresh the file tree
        await loadRootItems();
        
        // Expand target directory to show the new files
        if (!expandedPaths.has(targetPath)) {
          await handleDirectoryToggle(targetPath, true);
        }
      }
      
      if (errorCount > 0) {
        setFileError(`Failed to copy ${errorCount} files via Tauri. Check console for details.`);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle Tauri file drop:', error);
      setFileError(`Failed to copy external files: ${error}`);
    }
  }, [loadRootItems, expandedPaths, handleDirectoryToggle]);

  // ================================
  // TAURI FILE DROP LISTENER  
  // ================================

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupFileDropListener = async () => {
      try {
        unlisten = await listen('tauri://drag-drop', (event: any) => {
          console.log('🌍 Tauri file drop detected:', event.payload);
          
          // Extract file paths from the payload
          const filePaths = event.payload.paths || event.payload || [];
          
          if (filePaths && filePaths.length > 0) {
            console.log('📂 Processing file paths:', filePaths);
            handleTauriFileDrop(rootPath, filePaths);
          } else {
            console.warn('⚠️ No file paths found in drop event payload');
          }
        });
        
        console.log('✅ Tauri file drop listener registered');
      } catch (error) {
        console.error('❌ Failed to setup Tauri file drop listener:', error);
      }
    };

    setupFileDropListener();

    return () => {
      if (unlisten) {
        unlisten();
        console.log('🧹 Tauri file drop listener cleaned up');
      }
    };
  }, [rootPath, handleTauriFileDrop]);

  // ================================
  // KEYBOARD SHORTCUTS
  // ================================

  useShortcut('fileManagement', 'deleteFile', () => {
    deleteSelectedFile().catch(console.error);
  }, [deleteSelectedFile]);
  
  useShortcut('fileManagement', 'forceDeleteFile', () => {
    forceDeleteSelectedFile().catch(console.error);
  }, [forceDeleteSelectedFile]);
  
  useShortcut('fileManagement', 'refreshExplorer', () => {
    refreshFileExplorer().catch(console.error);
  }, [refreshFileExplorer]);
  
  // Search keyboard shortcut
  useShortcut('search', 'quickOpen', () => {
    const searchInput = document.querySelector('.file-search-bar input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }, []);

  // Global drag & drop handlers for external files
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Allow external file drops
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleGlobalDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Handle external file drops on the root directory
    if (e.dataTransfer.files.length > 0) {
      console.log('🌍 External file drop on root directory');
      await handleExternalFileDrop(rootPath, e.dataTransfer.files);
    }
  }, [rootPath, handleExternalFileDrop]);

  return (
    <div 
      className={`file-explorer-virtualized h-full relative ${className}`}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
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
      <div className="file-explorer-header px-3 py-2 bg-vscode-sidebar border-b border-gray-700/30 text-xs font-medium text-vscode-fg flex items-center justify-between">
        <span>EXPLORER</span>
        <div className="flex items-center gap-2">
          {/* Drag status indicator */}
          {isDragMode && draggedNode && (
            <div className="flex items-center text-blue-400">
              <Move size={12} className="mr-1 animate-bounce" />
              <span className="text-xs">
                {dragOperation === 'copy' ? 'Copying' : 'Moving'} {draggedNode.name}
              </span>
            </div>
          )}
          
          {/* Live file watcher status indicator */}
          {fileWatcher.isWatching && (
            <div className="flex items-center text-vscode-accent">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
              <span className="text-xs">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="file-search-bar px-3 py-2 bg-vscode-sidebar border-b border-gray-700/30">
        <div className="relative">
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search files... (Ctrl+P)"
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-vscode-input border border-gray-600 rounded text-vscode-fg placeholder-gray-400 focus:border-vscode-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {isSearchMode && (
          <div className="text-xs text-gray-400 mt-1">
            {filteredNodes.length} result{filteredNodes.length !== 1 ? 's' : ''} found
          </div>
        )}
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
      <div className="file-list-container" style={{ height: height - 120, overflow: 'hidden' }}>
        {filteredNodes.length > 0 ? (
          <List
            ref={listRef}
            height={height - 120} // Account for header and search bar
            width="100%"
            itemCount={filteredNodes.length}
            itemSize={24} // Height per item in pixels
            itemData={listItemData}
            overscanCount={10} // Render more extra items for smooth scrolling
            className="file-list"
            style={{ outline: 'none' }}
          >
            {FileExplorerItem}
          </List>
        ) : !isInitialLoading ? (
          <div className="empty-state">
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">{isSearchMode ? '🔍' : '📁'}</div>
              <div className="text-sm">{isSearchMode ? 'No search results' : 'No files found'}</div>
              <div className="text-xs mt-2 text-gray-500">
                {isSearchMode ? 'Try adjusting your search query' : 'Try selecting a different folder'}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Footer with stats */}
      <div className="file-explorer-footer">
        <div className="text-xs text-gray-400">
          {isSearchMode ? (
            <>
              {filteredNodes.length} search result{filteredNodes.length !== 1 ? 's' : ''}
              {searchQuery && ` for "${searchQuery}"`}
            </>
          ) : (
            <>
              {filteredNodes.length} items visible
              {isInitialLoading && ' (loading...)'}
              {folderLoadingPaths.size > 0 && ` • ${folderLoadingPaths.size} folder${folderLoadingPaths.size > 1 ? 's' : ''} expanding`}
            </>
          )}
          {fileWatcher.isWatching && ` • Live updates: ${fileWatcher.eventCount} events`}
        </div>
      </div>
    </div>
  );
}; 