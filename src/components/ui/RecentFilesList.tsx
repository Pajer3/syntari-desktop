// Syntari AI IDE - Enterprise Recent Files List Component
// Advanced recent files system with business intelligence, performance optimization, and accessibility

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';
import { announceShortcut } from '../../utils/keyboardUtils';

// ================================
// ENHANCED TYPES & INTERFACES
// ================================

export interface RecentFile {
  name: string;
  path: string;
  lastAccessed: string;
  lastAccessedTimestamp: number;
  type: 'typescript' | 'javascript' | 'css' | 'html' | 'json' | 'config' | 'markdown' | 'other';
  size?: number;
  projectPath?: string;
  isStarred?: boolean;
  accessCount?: number;
  lastModified?: number;
  tags?: string[];
}

export interface RecentFilesListProps {
  files?: RecentFile[];
  onFileOpen?: (file: RecentFile) => void;
  onFileRemove?: (filePath: string) => void;
  onClearHistory?: () => void;
  onStarToggle?: (filePath: string) => void;
  maxDisplayFiles?: number;
  enableKeyboardNavigation?: boolean;
  enableContextMenu?: boolean;
  showFilePreview?: boolean;
  sortBy?: 'lastAccessed' | 'name' | 'accessCount' | 'size';
  filterBy?: string;
  className?: string;
  groupByProject?: boolean;
  showMetrics?: boolean;
}

interface RecentFilesMetrics {
  totalFiles: number;
  starredFiles: number;
  averageAccessCount: number;
  totalSize: number;
  mostAccessedFile: RecentFile | null;
  projectDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
}

interface FileContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  file: RecentFile;
  onClose: () => void;
  onAction: (action: string, file: RecentFile) => void;
}

// ================================
// ENHANCED RECENT FILES MANAGER
// ================================

class RecentFilesManager {
  private metrics: RecentFilesMetrics = {
    totalFiles: 0,
    starredFiles: 0,
    averageAccessCount: 0,
    totalSize: 0,
    mostAccessedFile: null,
    projectDistribution: {},
    typeDistribution: {}
  };

  private readonly STORAGE_KEY = 'syntari-recent-files';
  private readonly MAX_RECENT_FILES = 100;

  calculateMetrics(files: RecentFile[]): RecentFilesMetrics {
    const totalFiles = files.length;
    const starredFiles = files.filter(f => f.isStarred).length;
    const totalAccessCount = files.reduce((sum, f) => sum + (f.accessCount || 1), 0);
    const averageAccessCount = totalFiles > 0 ? totalAccessCount / totalFiles : 0;
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    
    const mostAccessedFile = files.reduce((max, file) => 
      (file.accessCount || 1) > (max?.accessCount || 0) ? file : max, null as RecentFile | null);

    const projectDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};

    files.forEach(file => {
      // Project distribution
      const project = file.projectPath || 'Unknown';
      projectDistribution[project] = (projectDistribution[project] || 0) + 1;

      // Type distribution
      typeDistribution[file.type] = (typeDistribution[file.type] || 0) + 1;
    });

    this.metrics = {
      totalFiles,
      starredFiles,
      averageAccessCount,
      totalSize,
      mostAccessedFile,
      projectDistribution,
      typeDistribution
    };

    return this.metrics;
  }

  getMetrics(): RecentFilesMetrics {
    return { ...this.metrics };
  }

  logBusinessImpact(action: string, file: RecentFile): void {
    console.log(`📊 RecentFiles Business Impact: ${action}`, {
      timestamp: new Date().toISOString(),
      action,
      file: {
        name: file.name,
        type: file.type,
        accessCount: file.accessCount || 1,
        project: file.projectPath
      },
      metrics: this.getMetrics()
    });
  }

  saveToStorage(files: RecentFile[]): void {
    try {
      const storageData = {
        files: files.slice(0, this.MAX_RECENT_FILES),
        lastUpdated: Date.now(),
        version: '2.0.0'
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save recent files to storage:', error);
    }
  }

  loadFromStorage(): RecentFile[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.files || [];
      }
    } catch (error) {
      console.error('Failed to load recent files from storage:', error);
    }
    return [];
  }
}

// ================================
// MEMOIZED FILE CONTEXT MENU
// ================================

const FileContextMenu: React.FC<FileContextMenuProps> = memo(({
  visible,
  x,
  y,
  file,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Focus management
    if (menuRef.current) {
      const firstButton = menuRef.current.querySelector('button:not([disabled])') as HTMLButtonElement;
      firstButton?.focus();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  const menuItems = useMemo(() => [
    { id: 'open', label: 'Open File', disabled: false, hotkey: 'Enter' },
    { id: 'open-new-tab', label: 'Open in New Tab', disabled: false },
    { id: 'separator1', label: '---', disabled: true },
    { id: 'star', label: file.isStarred ? 'Remove Star' : 'Add Star', disabled: false },
    { id: 'separator2', label: '---', disabled: true },
    { id: 'copy-path', label: 'Copy Full Path', disabled: false },
    { id: 'copy-name', label: 'Copy File Name', disabled: false },
    { id: 'reveal-explorer', label: 'Reveal in File Explorer', disabled: false },
    { id: 'separator3', label: '---', disabled: true },
    { id: 'remove', label: 'Remove from Recent', disabled: false, danger: true },
  ], [file.isStarred]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-vscode-bg border border-vscode-border shadow-lg rounded-sm py-1 min-w-[200px]"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Recent file context menu"
    >
      {menuItems.map((item) => (
        item.label === '---' ? (
          <div key={item.id} className="border-t border-vscode-border my-1" role="separator" />
        ) : (
          <button
            key={item.id}
            onClick={() => {
              onAction(item.id, file);
              onClose();
            }}
            disabled={item.disabled}
            className={`
              w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between
              ${item.disabled 
                ? 'text-vscode-fg-muted cursor-default' 
                : item.danger
                  ? 'text-red-400 hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10 focus:outline-none'
                  : 'text-vscode-fg hover:bg-vscode-list-hover cursor-pointer focus:bg-vscode-list-hover focus:outline-none'
              }
            `}
            role="menuitem"
            tabIndex={item.disabled ? -1 : 0}
          >
            <span>{item.label}</span>
            {item.hotkey && (
              <span className="text-xs text-vscode-fg-muted ml-4">{item.hotkey}</span>
            )}
          </button>
        )
      ))}
    </div>
  );
});

FileContextMenu.displayName = 'FileContextMenu';

// ================================
// MEMOIZED FILE ITEM COMPONENT
// ================================

const RecentFileItem: React.FC<{
  file: RecentFile;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onOpen: (file: RecentFile) => void;
  onContextMenu: (e: React.MouseEvent, file: RecentFile) => void;
  onStarToggle?: (filePath: string) => void;
  showPreview?: boolean;
}> = memo(({
  file,
  index,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  onStarToggle,
  showPreview = false,
}) => {
  const getFileIcon = useCallback((type: string): string => {
    const iconMap: Record<string, string> = {
      'typescript': '🔷',
      'javascript': '💛',
      'css': '🎨',
      'html': '🌐',
      'json': '📋',
      'config': '⚙️',
      'markdown': '📝',
      'other': '📄'
    };
    return iconMap[type] || iconMap.other;
  }, []);

  const getFileColor = useCallback((type: string): string => {
    const colorMap: Record<string, string> = {
      'typescript': 'blue',
      'javascript': 'yellow',
      'css': 'purple',
      'html': 'orange',
      'json': 'green',
      'config': 'gray',
      'markdown': 'blue',
      'other': 'gray'
    };
    return colorMap[type] || colorMap.other;
  }, []);

  const formatFileSize = useCallback((size?: number): string => {
    if (!size) return '';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }, []);

  const formatRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        onOpen(file);
        break;
      case ' ':
        e.preventDefault();
        onSelect(index);
        break;
      case 's':
      case 'S':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onStarToggle?.(file.path);
        }
        break;
    }
  }, [file, index, onOpen, onSelect, onStarToggle]);

  const color = getFileColor(file.type);

  return (
    <div
      className={`
        group flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer
        ${isSelected 
          ? 'bg-vscode-list-active text-vscode-list-active-fg ring-1 ring-vscode-accent' 
          : 'hover:bg-vscode-list-hover'
        }
      `}
      onClick={() => onOpen(file)}
      onContextMenu={(e) => onContextMenu(e, file)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      aria-label={`Recent file: ${file.name}, last accessed ${formatRelativeTime(file.lastAccessedTimestamp)}`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* File Icon with Type Indicator */}
        <div className={`
          w-10 h-10 bg-${color}-600/10 border border-${color}-600/20 rounded-lg flex items-center justify-center relative flex-shrink-0
        `}>
          <span className="text-lg" role="img" aria-label={`${file.type} file`}>
            {getFileIcon(file.type)}
          </span>
          {file.isStarred && (
            <span 
              className="absolute -top-1 -right-1 text-yellow-500 text-xs"
              title="Starred file"
              aria-label="Starred"
            >
              ⭐
            </span>
          )}
        </div>

        {/* File Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-vscode-fg truncate block">
              {file.name}
            </span>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Star Toggle */}
              {onStarToggle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStarToggle(file.path);
                  }}
                  className={`
                    p-1 rounded transition-colors
                    ${file.isStarred 
                      ? 'text-yellow-500 hover:text-yellow-400' 
                      : 'text-vscode-fg-muted hover:text-yellow-500'
                    }
                  `}
                  title={file.isStarred ? 'Remove star' : 'Add star'}
                  aria-label={file.isStarred ? 'Remove star' : 'Add star'}
                >
                  <span className="text-xs">⭐</span>
                </button>
              )}

              {/* Access Count Badge */}
              {(file.accessCount || 1) > 1 && (
                <span 
                  className="text-xs bg-vscode-accent text-vscode-fg px-1.5 py-0.5 rounded"
                  title={`Opened ${file.accessCount} times`}
                >
                  {file.accessCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-vscode-fg-muted truncate flex-1">
              {file.projectPath ? `${file.projectPath}/.../${file.name}` : file.path}
            </p>
            
            <div className="flex items-center space-x-2 text-xs text-vscode-fg-muted">
              {/* File Size */}
              {file.size && (
                <span>{formatFileSize(file.size)}</span>
              )}
              
              {/* Last Accessed */}
              <span className="group-hover:text-vscode-fg transition-colors">
                {formatRelativeTime(file.lastAccessedTimestamp)}
              </span>
            </div>
          </div>

          {/* File Preview */}
          {showPreview && file.type !== 'other' && (
            <div className="mt-2 text-xs text-vscode-fg-muted opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-vscode-bg border border-vscode-border rounded p-2 max-h-20 overflow-hidden">
                <div className="italic">Preview not available</div>
              </div>
            </div>
          )}

          {/* Tags */}
          {file.tags && file.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {file.tags.slice(0, 3).map((tag, idx) => (
                <span 
                  key={idx}
                  className="text-xs bg-vscode-button text-vscode-button-fg px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {file.tags.length > 3 && (
                <span className="text-xs text-vscode-fg-muted">
                  +{file.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

RecentFileItem.displayName = 'RecentFileItem';

// ================================
// ENHANCED RECENT FILES LIST COMPONENT
// ================================

export const RecentFilesList: React.FC<RecentFilesListProps> = ({
  files: initialFiles,
  onFileOpen,
  onFileRemove,
  onClearHistory,
  onStarToggle,
  maxDisplayFiles = 10,
  enableKeyboardNavigation = true,
  enableContextMenu = true,
  showFilePreview = false,
  sortBy = 'lastAccessed',
  filterBy = '',
  className = '',
  groupByProject = false,
  showMetrics = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    file: RecentFile;
  }>({ visible: false, x: 0, y: 0, file: {} as RecentFile });

  const managerRef = useRef(new RecentFilesManager());
  const containerRef = useRef<HTMLDivElement>(null);

  // Default files with enhanced metadata
  const defaultFiles: RecentFile[] = useMemo(() => [
  {
    name: 'App.tsx',
    path: 'syntari-desktop/src/App.tsx',
      lastAccessed: '5m ago',
      lastAccessedTimestamp: Date.now() - 5 * 60 * 1000,
    type: 'typescript',
      size: 15420,
      projectPath: 'syntari-desktop',
      accessCount: 15,
      isStarred: true,
      tags: ['main', 'component']
    },
    {
      name: 'TabLayout.tsx',
      path: 'syntari-desktop/src/components/TabLayout.tsx',
      lastAccessed: '12m ago',
      lastAccessedTimestamp: Date.now() - 12 * 60 * 1000,
    type: 'typescript',
      size: 33280,
      projectPath: 'syntari-desktop',
      accessCount: 8,
      tags: ['component', 'ui']
  },
  {
    name: 'App.css',
    path: 'syntari-desktop/src/App.css',
      lastAccessed: '18m ago',
      lastAccessedTimestamp: Date.now() - 18 * 60 * 1000,
    type: 'css',
      size: 35840,
      projectPath: 'syntari-desktop',
      accessCount: 5,
      tags: ['styles']
  },
  {
    name: 'vite.config.ts',
    path: 'syntari-desktop/vite.config.ts',
      lastAccessed: '25m ago',
      lastAccessedTimestamp: Date.now() - 25 * 60 * 1000,
    type: 'config',
      size: 880,
      projectPath: 'syntari-desktop',
      accessCount: 3,
      isStarred: true,
      tags: ['config', 'build']
    },
    {
      name: 'README.md',
      path: 'README.MD',
      lastAccessed: '1h ago',
      lastAccessedTimestamp: Date.now() - 60 * 60 * 1000,
      type: 'markdown',
      size: 51200,
      accessCount: 12,
      isStarred: true,
      tags: ['documentation']
    }
  ], []);

  const files = initialFiles || defaultFiles;

  // Enhanced keyboard navigation
  useShortcut('navigation', 'quickOpen', useCallback((e) => {
    if (selectedIndex >= 0 && selectedIndex < processedFiles.length) {
      e.preventDefault?.();
      const selectedFile = processedFiles[selectedIndex];
      onFileOpen?.(selectedFile);
      announceShortcut('Open Recent File', `Opening ${selectedFile.name}`);
    }
  }, [selectedIndex, files, onFileOpen]));

  // Enhanced file processing with sorting and filtering
  const processedFiles = useMemo(() => {
    let result = [...files];

    // Apply filtering
    if (filterBy) {
      const filter = filterBy.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(filter) ||
        file.path.toLowerCase().includes(filter) ||
        file.type.toLowerCase().includes(filter) ||
        file.tags?.some(tag => tag.toLowerCase().includes(filter))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'accessCount':
          return (b.accessCount || 1) - (a.accessCount || 1);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'lastAccessed':
        default:
          return b.lastAccessedTimestamp - a.lastAccessedTimestamp;
      }
    });

    // Starred files first
    const starredFiles = result.filter(f => f.isStarred);
    const unstarredFiles = result.filter(f => !f.isStarred);
    result = [...starredFiles, ...unstarredFiles];

    // Apply display limit
    return result.slice(0, maxDisplayFiles);
  }, [files, filterBy, sortBy, maxDisplayFiles]);

  // Calculate metrics
  const metrics = useMemo(() => {
    return managerRef.current.calculateMetrics(files);
  }, [files]);

  // Keyboard navigation handlers
  useEffect(() => {
    if (!enableKeyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          announceShortcut('Navigate Up', 'Moved to previous file');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(processedFiles.length - 1, prev + 1));
          announceShortcut('Navigate Down', 'Moved to next file');
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          announceShortcut('Navigate Home', 'Moved to first file');
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(processedFiles.length - 1);
          announceShortcut('Navigate End', 'Moved to last file');
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < processedFiles.length) {
            onFileOpen?.(processedFiles[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, selectedIndex, processedFiles, onFileOpen]);

  // Enhanced file actions
  const handleFileOpen = useCallback((file: RecentFile) => {
    managerRef.current.logBusinessImpact('file_open', file);
    onFileOpen?.(file);
  }, [onFileOpen]);

  const handleContextMenuAction = useCallback((action: string, file: RecentFile) => {
    switch (action) {
      case 'open':
        handleFileOpen(file);
        break;
      case 'open-new-tab':
        // Implementation would depend on tab system
        console.log('Open in new tab:', file.path);
        break;
      case 'star':
        onStarToggle?.(file.path);
        managerRef.current.logBusinessImpact('file_star_toggle', file);
        break;
      case 'copy-path':
        navigator.clipboard.writeText(file.path);
        announceShortcut('Copy Path', 'File path copied to clipboard');
        break;
      case 'copy-name':
        navigator.clipboard.writeText(file.name);
        announceShortcut('Copy Name', 'File name copied to clipboard');
        break;
      case 'reveal-explorer':
        console.log('Reveal in explorer:', file.path);
        break;
      case 'remove':
        onFileRemove?.(file.path);
        managerRef.current.logBusinessImpact('file_remove', file);
        break;
    }
  }, [handleFileOpen, onStarToggle, onFileRemove]);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: RecentFile) => {
    if (!enableContextMenu) return;
    
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file,
    });
  }, [enableContextMenu]);

  const handleClearHistory = useCallback(() => {
    if (onClearHistory) {
      // Log business impact before clearing
      if (files.length > 0) {
        const sampleFile: RecentFile = {
          name: 'History Clear',
          path: `cleared_${files.length}_files`,
          lastAccessed: new Date().toISOString(),
          lastAccessedTimestamp: Date.now(),
          type: 'other',
          accessCount: files.length
        };
        managerRef.current.logBusinessImpact('history_clear', sampleFile);
      }
      
      onClearHistory();
      announceShortcut('Clear History', 'Recent files history cleared');
    }
  }, [onClearHistory, files.length]);

  // Group files by project if enabled
  const groupedFiles = useMemo(() => {
    if (!groupByProject) {
      return { 'All Files': processedFiles };
    }

    const groups: Record<string, RecentFile[]> = {};
    processedFiles.forEach(file => {
      const project = file.projectPath || 'Other';
      if (!groups[project]) {
        groups[project] = [];
      }
      groups[project].push(file);
    });

    return groups;
  }, [processedFiles, groupByProject]);

  return (
    <div 
      ref={containerRef}
      className={`bg-vscode-sidebar/30 border border-vscode-border rounded-xl ${className}`}
      role="listbox"
      aria-label="Recent files list"
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-vscode-border">
        <div>
          <h3 className="text-lg font-semibold text-vscode-fg">Recent Files</h3>
          {showMetrics && (
            <div className="text-xs text-vscode-fg-muted mt-1">
              {metrics.totalFiles} files • {metrics.starredFiles} starred • {Math.round(metrics.averageAccessCount)} avg opens
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Sort Options */}
          <select 
            className="text-xs bg-vscode-button text-vscode-button-fg px-2 py-1 rounded border border-vscode-border"
            value={sortBy}
            onChange={(e) => {
              // This would be handled by parent component
              console.log('Sort changed to:', e.target.value);
            }}
            title="Sort files by"
          >
            <option value="lastAccessed">Recent</option>
            <option value="name">Name</option>
            <option value="accessCount">Frequency</option>
            <option value="size">Size</option>
          </select>

          {/* Clear History */}
          <button 
            onClick={handleClearHistory}
            className="text-xs text-vscode-fg-muted hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
            title="Clear recent files history"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* File Groups */}
      <div className="max-h-96 overflow-y-auto vscode-scrollbar">
        {Object.entries(groupedFiles).map(([groupName, groupFiles]) => (
          <div key={groupName}>
            {groupByProject && Object.keys(groupedFiles).length > 1 && (
              <div className="px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <h4 className="text-sm font-medium text-vscode-fg">{groupName}</h4>
                <div className="text-xs text-vscode-fg-muted">
                  {groupFiles.length} file{groupFiles.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            <div className="p-2 space-y-1">
              {groupFiles.map((file) => {
                const globalIndex = processedFiles.findIndex(f => f.path === file.path);
                return (
                  <RecentFileItem
                    key={file.path}
                    file={file}
                    index={globalIndex}
                    isSelected={selectedIndex === globalIndex}
                    onSelect={setSelectedIndex}
                    onOpen={handleFileOpen}
                    onContextMenu={handleContextMenu}
                    onStarToggle={onStarToggle}
                    showPreview={showFilePreview}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {processedFiles.length === 0 && (
          <div className="text-center py-8 text-vscode-fg-muted">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-sm">No recent files</p>
            {filterBy && (
              <p className="text-xs mt-2">
                No files match "{filterBy}"
              </p>
            )}
            <div className="mt-4 text-xs space-y-1">
              <div>Files you open will appear here</div>
              <div>⭐ Star files to keep them at the top</div>
              <div>Use Ctrl+P to quickly open files</div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Footer */}
      {showMetrics && processedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-vscode-border bg-vscode-sidebar/50">
          <div className="grid grid-cols-2 gap-4 text-xs text-vscode-fg-muted">
            <div>
              <div className="font-medium">Most Opened</div>
              <div className="truncate">
                {metrics.mostAccessedFile?.name || 'None'}
              </div>
            </div>
            <div>
              <div className="font-medium">Total Size</div>
              <div>
                {metrics.totalSize < 1024 * 1024 
                  ? `${(metrics.totalSize / 1024).toFixed(1)}KB`
                  : `${(metrics.totalSize / (1024 * 1024)).toFixed(1)}MB`
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <FileContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        file={contextMenu.file}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        onAction={handleContextMenuAction}
      />
    </div>
  );
}; 