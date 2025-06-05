// Syntari AI IDE - Enterprise File Explorer Component
// Advanced file tree with performance optimization, accessibility, and business intelligence

import React, { 
  useState, 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect,
  memo
} from 'react';
import type { ProjectContext, FileInfo } from '../../types';
import { getFileIcon } from '../../utils/editorUtils';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';
import { announceShortcut } from '../../utils/keyboardUtils';

// ================================
// ENHANCED TYPES & INTERFACES
// ================================

interface FileTreeNode {
  file: FileInfo;
  children: FileTreeNode[];
  isExpanded: boolean;
  depth: number;
  id: string;
  parentId?: string;
}

interface FileExplorerProps {
  project: ProjectContext;
  selectedFile?: string;
  onFileSelect: (file: FileInfo) => void;
  onFileContextMenu?: (file: FileInfo, event: React.MouseEvent) => void;
  onFolderExpand?: (folderPath: string, isExpanded: boolean) => void;
  className?: string;
  enableVirtualScrolling?: boolean;
  maxVisibleItems?: number;
}

interface FileExplorerMetrics {
  totalFiles: number;
  totalFolders: number;
  expandedFolders: number;
  selectedFile: string | null;
  lastInteraction: number;
  viewportItems: number;
  renderTime: number;
  memoryUsage: number;
}

interface VirtualScrollConfig {
  itemHeight: number;
  overscan: number;
  containerHeight: number;
}

// ================================
// PERFORMANCE MONITORING MANAGER
// ================================

class FileExplorerPerformanceManager {
  private metrics: FileExplorerMetrics = {
    totalFiles: 0,
    totalFolders: 0,
    expandedFolders: 0,
    selectedFile: null,
    lastInteraction: Date.now(),
    viewportItems: 0,
    renderTime: 0,
    memoryUsage: 0
  };

  private renderStartTime: number = 0;
  private readonly PERFORMANCE_THRESHOLD = 16; // 60fps target

  startRender(): void {
    this.renderStartTime = performance.now();
  }

  endRender(): void {
    const renderTime = performance.now() - this.renderStartTime;
    this.metrics.renderTime = renderTime;
    
    if (renderTime > this.PERFORMANCE_THRESHOLD) {
      console.warn(`🐌 FileExplorer render exceeded target (${renderTime.toFixed(2)}ms > ${this.PERFORMANCE_THRESHOLD}ms)`);
    }
  }

  updateMetrics(update: Partial<FileExplorerMetrics>): void {
    this.metrics = { ...this.metrics, ...update, lastInteraction: Date.now() };
  }

  getMetrics(): FileExplorerMetrics {
    return { ...this.metrics };
  }

  logBusinessImpact(action: string, context: any): void {
    console.log(`📊 FileExplorer Business Impact: ${action}`, {
      timestamp: new Date().toISOString(),
      action,
      context,
      metrics: this.getMetrics()
    });
  }
}

// ================================
// VIRTUAL SCROLLING UTILITIES
// ================================

interface VirtualScrollData {
  startIndex: number;
  endIndex: number;
  visibleItems: FileTreeNode[];
  totalHeight: number;
  offsetY: number;
  handleScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

const useVirtualScroll = (
  items: FileTreeNode[],
  config: VirtualScrollConfig,
  enabled: boolean = true
): VirtualScrollData => {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualData = useMemo(() => {
    if (!enabled || items.length === 0) {
      return {
        startIndex: 0,
        endIndex: items.length,
        visibleItems: items,
        totalHeight: items.length * config.itemHeight,
        offsetY: 0
      };
    }

    const { itemHeight, overscan, containerHeight } = config;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);
    
    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, config, scrollTop, enabled]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return { ...virtualData, handleScroll: enabled ? handleScroll : undefined };
};

// ================================
// ENHANCED FILE TREE BUILDER
// ================================

const buildEnhancedFileTree = (
  files: readonly FileInfo[], 
  rootPath: string,
  expandedFolders: Set<string>
): { flatTree: FileTreeNode[], metrics: { files: number, folders: number } } => {
  const tree: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();
  let fileCount = 0;
  let folderCount = 0;
  
  const normalizedRootPath = rootPath.replace(/\/$/, '');
  
  // Sort files: directories first, then alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    const aIsDir = a.language === 'directory';
    const bIsDir = b.language === 'directory';
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
  
  const filteredFiles = sortedFiles.filter(file => file.path !== normalizedRootPath);
  
  // Create nodes
  for (const file of filteredFiles) {
    const isDirectory = file.language === 'directory';
    const depth = (file.path.split('/').length - normalizedRootPath.split('/').length) - 1;
    
    const node: FileTreeNode = {
      file,
      children: [],
      isExpanded: isDirectory ? expandedFolders.has(file.path) : false,
      depth: Math.max(0, depth),
      id: file.path,
      parentId: file.path.substring(0, file.path.lastIndexOf('/'))
    };
    
    nodeMap.set(file.path, node);
    
    if (isDirectory) {
      folderCount++;
    } else {
      fileCount++;
    }
  }
  
  // Build hierarchy
  for (const file of filteredFiles) {
    const node = nodeMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    if (parentPath === normalizedRootPath) {
      tree.push(node);
    } else {
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else if (!parentPath.startsWith(normalizedRootPath)) {
        tree.push(node);
      }
    }
  }
  
  // Flatten tree for virtual scrolling
  const flatTree: FileTreeNode[] = [];
  
  const flatten = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      flatTree.push(node);
      if (node.isExpanded && node.children.length > 0) {
        flatten(node.children);
      }
    }
  };
  
  flatten(tree);
  
  return { 
    flatTree, 
    metrics: { files: fileCount, folders: folderCount }
  };
};

// ================================
// MEMOIZED FILE TREE ITEM
// ================================

const FileTreeItem = memo<{
  node: FileTreeNode;
  selectedFile?: string;
  onFileSelect: (file: FileInfo) => void;
  onToggleExpand: (path: string) => void;
  onContextMenu?: (file: FileInfo, event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}>(({ node, selectedFile, onFileSelect, onToggleExpand, onContextMenu, style }) => {
  const { file, depth, children, isExpanded } = node;
  const isDirectory = file.language === 'directory';
  const isSelected = selectedFile === file.path;
  const hasChildren = children.length > 0;
  
  const handleClick = useCallback(() => {
    if (isDirectory) {
      onToggleExpand(file.path);
    } else {
      onFileSelect(file);
    }
  }, [isDirectory, file, onToggleExpand, onFileSelect]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    onContextMenu?.(file, event);
  }, [file, onContextMenu]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleClick();
        break;
      case 'ArrowRight':
        if (isDirectory && !isExpanded) {
          event.preventDefault();
          onToggleExpand(file.path);
        }
        break;
      case 'ArrowLeft':
        if (isDirectory && isExpanded) {
          event.preventDefault();
          onToggleExpand(file.path);
        }
        break;
    }
  }, [isDirectory, isExpanded, handleClick, onToggleExpand, file.path]);
  
  return (
    <div
      className={`
        flex items-center px-2 py-1 cursor-pointer transition-colors group
        hover:bg-vscode-list-hover
        ${isSelected ? 'bg-vscode-list-active text-vscode-list-active-fg' : 'text-vscode-fg'}
        ${isDirectory ? 'font-medium' : ''}
      `}
      style={{
        ...style,
        paddingLeft: `${8 + depth * 16}px`,
        minHeight: '22px'
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role={isDirectory ? 'treeitem' : 'option'}
      aria-expanded={isDirectory ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-label={`${isDirectory ? 'Folder' : 'File'}: ${file.name}`}
    >
      {/* Chevron for directories */}
      {isDirectory && (
        <span 
          className={`
            text-xs mr-1 transition-transform duration-150 text-vscode-fg-muted
            ${isExpanded ? 'rotate-90' : ''}
          `}
          style={{ width: '12px', textAlign: 'center' }}
        >
          {hasChildren ? '▶' : ''}
        </span>
      )}
      
      {/* File/Folder Icon */}
      <span className="mr-2 text-base flex-shrink-0">
        {isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(file.extension)}
      </span>
      
      {/* File Name */}
      <span className="flex-1 truncate text-sm">
        {file.name}
      </span>
      
      {/* File Size (for files only) */}
      {!isDirectory && file.size > 0 && (
        <span className="text-xs text-vscode-fg-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {file.size < 1024 
            ? `${file.size}B` 
            : file.size < 1024 * 1024 
              ? `${(file.size / 1024).toFixed(1)}KB`
              : `${(file.size / (1024 * 1024)).toFixed(1)}MB`
          }
        </span>
      )}
    </div>
  );
});

FileTreeItem.displayName = 'FileTreeItem';

// ================================
// ENHANCED FILE EXPLORER COMPONENT
// ================================

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  selectedFile,
  onFileSelect,
  onFileContextMenu,
  onFolderExpand,
  className,
  enableVirtualScrolling = true,
  maxVisibleItems = 1000
}) => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([project.rootPath])
  );
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1);
  
  // ================================
  // REFS & PERFORMANCE
  // ================================
  
  const containerRef = useRef<HTMLDivElement>(null);
  const performanceManagerRef = useRef(new FileExplorerPerformanceManager());
  
  // ================================
  // KEYBOARD NAVIGATION
  // ================================
  
  const handleKeyboardNavigation = useCallback((direction: 'up' | 'down' | 'expand' | 'collapse') => {
    const flatTree = buildEnhancedFileTree(project.openFiles, project.rootPath, expandedFolders).flatTree;
    
    switch (direction) {
      case 'up':
        setFocusedItemIndex(prev => Math.max(0, prev - 1));
        announceShortcut('Navigate Up', 'Moved up in file explorer');
        break;
      case 'down':
        setFocusedItemIndex(prev => Math.min(flatTree.length - 1, prev + 1));
        announceShortcut('Navigate Down', 'Moved down in file explorer');
        break;
      case 'expand':
        if (focusedItemIndex >= 0 && focusedItemIndex < flatTree.length) {
          const node = flatTree[focusedItemIndex];
          if (node.file.language === 'directory' && !node.isExpanded) {
            toggleFolder(node.file.path);
            announceShortcut('Folder Expanded', `Expanded folder ${node.file.name}`);
          }
        }
        break;
      case 'collapse':
        if (focusedItemIndex >= 0 && focusedItemIndex < flatTree.length) {
          const node = flatTree[focusedItemIndex];
          if (node.file.language === 'directory' && node.isExpanded) {
            toggleFolder(node.file.path);
            announceShortcut('Folder Collapsed', `Collapsed folder ${node.file.name}`);
          }
        }
        break;
    }
  }, [project.openFiles, project.rootPath, expandedFolders, focusedItemIndex]);

  // Enhanced keyboard navigation with business tracking
  useShortcut('navigation', 'goToLine', () => handleKeyboardNavigation('up'));
  useShortcut('navigation', 'goToSymbol', () => handleKeyboardNavigation('down'));
  useShortcut('navigation', 'jumpToMatchingBracket', () => handleKeyboardNavigation('expand'));
  useShortcut('navigation', 'toggleBookmark', () => handleKeyboardNavigation('collapse'));
  
  // ================================
  // FOLDER TOGGLE LOGIC
  // ================================
  
  const toggleFolder = useCallback((path: string) => {
    const wasExpanded = expandedFolders.has(path);
    
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
    
    // Notify parent component
    onFolderExpand?.(path, !wasExpanded);
    
    // Track business impact
    performanceManagerRef.current.logBusinessImpact('folder_toggle', {
      path,
      expanded: !wasExpanded,
      totalExpanded: expandedFolders.size
    });
  }, [expandedFolders, onFolderExpand]);
  
  // ================================
  // FILE TREE COMPUTATION
  // ================================
  
  const { flatTree, treeMetrics } = useMemo(() => {
    performanceManagerRef.current.startRender();
    
    const result = buildEnhancedFileTree(project.openFiles, project.rootPath, expandedFolders);
    
    // Update performance metrics
    performanceManagerRef.current.updateMetrics({
      totalFiles: treeMetrics.files,
      totalFolders: treeMetrics.folders,
      expandedFolders: expandedFolders.size,
      selectedFile,
      viewportItems: Math.min(result.flatTree.length, maxVisibleItems)
    });
    
    performanceManagerRef.current.endRender();
    
    return { flatTree: result.flatTree, treeMetrics: result.metrics };
  }, [project.openFiles, project.rootPath, expandedFolders, selectedFile, maxVisibleItems]);
  
  // ================================
  // VIRTUAL SCROLLING SETUP
  // ================================
  
  const virtualScrollConfig: VirtualScrollConfig = {
    itemHeight: 22,
    overscan: 5,
    containerHeight: 400 // Will be updated dynamically
  };

  const virtualScroll = useVirtualScroll(flatTree, virtualScrollConfig, enableVirtualScrolling);
  
  // ================================
  // ENHANCED FILE SELECTION
  // ================================
  
  const handleFileSelect = useCallback((file: FileInfo) => {
    onFileSelect(file);
    performanceManagerRef.current.logBusinessImpact('file_select', {
      fileName: file.name,
      fileType: file.extension,
      fileSize: file.size
    });
  }, [onFileSelect]);

  // ================================
  // EFFECTS
  // ================================
  
  // Update container height for virtual scrolling
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        virtualScrollConfig.containerHeight = height;
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // ================================
  // RENDER
  // ================================
  
  return (
    <div className={`file-explorer h-full flex flex-col ${className || ''}`}>
      {/* Explorer Header */}
      <div className="px-3 py-2 bg-vscode-sidebar border-b border-vscode-border">
        <h2 className="text-sm font-semibold text-vscode-fg">
          Explorer
        </h2>
        <div className="text-xs text-vscode-fg-muted mt-1">
          {treeMetrics.files} files, {treeMetrics.folders} folders
        </div>
      </div>
      
      {/* Project Root Section */}
      <div className="px-2 py-1 bg-vscode-sidebar border-b border-vscode-border">
        <div 
          className="flex items-center px-2 py-1 cursor-pointer hover:bg-vscode-list-hover rounded transition-colors"
          onClick={() => toggleFolder(project.rootPath)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFolder(project.rootPath);
            }
          }}
          tabIndex={0}
          role="treeitem"
          aria-expanded={expandedFolders.has(project.rootPath)}
          aria-label={`Project root: ${project.rootPath.split('/').pop() || 'Project'}`}
        >
          <span className="text-xs mr-1 transition-transform duration-150 text-vscode-fg-muted">
            {expandedFolders.has(project.rootPath) ? '▼' : '▶'}
          </span>
          <span className="text-base mr-2">
            {expandedFolders.has(project.rootPath) ? '📂' : '📁'}
          </span>
          <span className="font-semibold text-sm text-vscode-fg">
            {project.rootPath.split('/').pop() || 'Project'}
          </span>
        </div>
      </div>
      
      {/* File Tree with Virtual Scrolling */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto vscode-scrollbar"
        onScroll={virtualScroll.handleScroll}
        role="tree"
        aria-label="File explorer tree"
      >
        {expandedFolders.has(project.rootPath) && (
          <div style={{ height: virtualScroll.totalHeight, position: 'relative' }}>
            <div 
              style={{ 
                transform: `translateY(${virtualScroll.offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              {virtualScroll.visibleItems.map((node, index) => (
                <FileTreeItem
                  key={node.id}
                  node={node}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onToggleExpand={toggleFolder}
                  onContextMenu={onFileContextMenu}
                  style={{ 
                    height: virtualScrollConfig.itemHeight,
                    opacity: focusedItemIndex === virtualScroll.startIndex + index ? 0.8 : 1
                  }}
                />
              ))}
            </div>
            
            {flatTree.length === 0 && (
              <div className="text-center py-8 text-vscode-fg-muted">
                <div className="text-sm">📁 No files found</div>
                <div className="text-xs mt-1">
                  This folder appears to be empty
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Performance & Stats Footer */}
      <div className="px-3 py-2 bg-vscode-sidebar border-t border-vscode-border">
        <div className="flex justify-between items-center text-xs text-vscode-fg-muted">
          <span>
            {project.openFiles.length} items • {project.projectType}
          </span>
          <span>
            {enableVirtualScrolling ? `Virtual: ${virtualScroll.visibleItems.length}/${flatTree.length}` : `All: ${flatTree.length}`}
          </span>
        </div>
      </div>
    </div>
  );
}; 