// Syntari AI IDE - Status Bar Component
// VS Code-style status bar with file info, git status, and extensible indicators

import React, { useState, useCallback } from 'react';

interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  icon?: string;
  priority: number; // Higher priority shows first
  color?: 'default' | 'warning' | 'error' | 'success' | 'info';
  onClick?: () => void;
  visible?: boolean;
}

interface FileStatus {
  name: string;
  language: string;
  lineCount: number;
  currentLine: number;
  currentColumn: number;
  encoding: string;
  eol: 'LF' | 'CRLF';
  isModified: boolean;
  fileSize: number;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: number;
  staged: number;
  untracked: number;
  hasChanges: boolean;
}

interface StatusBarProps {
  fileStatus?: FileStatus;
  gitStatus?: GitStatus;
  items?: StatusBarItem[];
  onItemClick?: (itemId: string) => void;
  onLanguageClick?: () => void;
  onEncodingClick?: () => void;
  onLineEndingClick?: () => void;
  onLineNumberClick?: () => void;
  className?: string;
  compact?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  fileStatus,
  gitStatus,
  items = [],
  onItemClick,
  onLanguageClick,
  onEncodingClick,
  onLineEndingClick,
  onLineNumberClick,
  className = '',
  compact = false,
}) => {
  const [showAllItems, setShowAllItems] = useState(false);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  // Get color class for status items
  const getColorClass = useCallback((color: StatusBarItem['color']) => {
    switch (color) {
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'info': return 'text-blue-400';
      default: return 'text-vscode-fg';
    }
  }, []);

  // Sort items by priority
  const sortedItems = [...items]
    .filter(item => item.visible !== false)
    .sort((a, b) => b.priority - a.priority);

  // Handle item click
  const handleItemClick = useCallback((item: StatusBarItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (onItemClick) {
      onItemClick(item.id);
    }
  }, [onItemClick]);

  return (
    <div className={`status-bar bg-vscode-statusbar text-vscode-statusbar-fg border-t border-vscode-border flex items-center justify-between text-xs ${className}`}>
      {/* Left Section - Git and Primary Status */}
      <div className="flex items-center space-x-4 px-3 py-1">
        {/* Git Status */}
        {gitStatus && (
          <div className="flex items-center space-x-2">
            <button
              className="flex items-center space-x-1 hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors"
              title={`Branch: ${gitStatus.branch}${gitStatus.ahead > 0 ? ` • ${gitStatus.ahead} ahead` : ''}${gitStatus.behind > 0 ? ` • ${gitStatus.behind} behind` : ''}`}
            >
              <span>🌿</span>
              <span className="font-mono">{gitStatus.branch}</span>
              {gitStatus.ahead > 0 && (
                <span className="text-green-400">↑{gitStatus.ahead}</span>
              )}
              {gitStatus.behind > 0 && (
                <span className="text-red-400">↓{gitStatus.behind}</span>
              )}
            </button>

            {/* Change Summary */}
            {gitStatus.hasChanges && (
              <div className="flex items-center space-x-1">
                {gitStatus.staged > 0 && (
                  <span className="text-green-400" title={`${gitStatus.staged} staged changes`}>
                    ●{gitStatus.staged}
                  </span>
                )}
                {gitStatus.modified > 0 && (
                  <span className="text-yellow-400" title={`${gitStatus.modified} modified files`}>
                    ●{gitStatus.modified}
                  </span>
                )}
                {gitStatus.untracked > 0 && (
                  <span className="text-blue-400" title={`${gitStatus.untracked} untracked files`}>
                    ●{gitStatus.untracked}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Items (High Priority) */}
        {sortedItems
          .filter(item => item.priority > 50)
          .slice(0, compact ? 2 : 5)
          .map(item => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex items-center space-x-1 hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors ${getColorClass(item.color)}`}
              title={item.tooltip}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.text}</span>
            </button>
          ))}
      </div>

      {/* Right Section - File Status and Settings */}
      <div className="flex items-center space-x-2 px-3 py-1">
        {/* Custom Items (Low Priority) */}
        {sortedItems
          .filter(item => item.priority <= 50)
          .slice(0, compact ? 1 : 3)
          .map(item => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex items-center space-x-1 hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors ${getColorClass(item.color)}`}
              title={item.tooltip}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.text}</span>
            </button>
          ))}

        {/* File Status */}
        {fileStatus && (
          <>
            {/* Line/Column Position */}
            <button
              onClick={onLineNumberClick}
              className="hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors font-mono"
              title="Go to line (Ctrl+G)"
            >
              Ln {fileStatus.currentLine}, Col {fileStatus.currentColumn}
            </button>

            {/* Language */}
            <button
              onClick={onLanguageClick}
              className="hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors"
              title="Select Language Mode"
            >
              {fileStatus.language}
            </button>

            {/* Encoding */}
            <button
              onClick={onEncodingClick}
              className="hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors"
              title="Select Encoding"
            >
              {fileStatus.encoding}
            </button>

            {/* Line Ending */}
            <button
              onClick={onLineEndingClick}
              className="hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors"
              title="Select End of Line Sequence"
            >
              {fileStatus.eol}
            </button>

            {/* File Info */}
            {!compact && (
              <div className="text-vscode-statusbar-fg-muted">
                <span title={`${fileStatus.lineCount} lines`}>
                  {fileStatus.lineCount} lines
                </span>
                {fileStatus.fileSize > 0 && (
                  <>
                    <span className="mx-1">•</span>
                    <span title={`File size: ${formatFileSize(fileStatus.fileSize)}`}>
                      {formatFileSize(fileStatus.fileSize)}
                    </span>
                  </>
                )}
                {fileStatus.isModified && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="text-orange-400">Modified</span>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* More Items Button */}
        {sortedItems.length > (compact ? 3 : 8) && (
          <button
            onClick={() => setShowAllItems(!showAllItems)}
            className="hover:bg-vscode-statusbar-hover px-2 py-1 rounded transition-colors"
            title="Show all status items"
          >
            ⋯
          </button>
        )}
      </div>

      {/* Overflow Items Dropdown */}
      {showAllItems && sortedItems.length > (compact ? 3 : 8) && (
        <div className="absolute bottom-full right-4 mb-1 bg-vscode-dropdown border border-vscode-border rounded shadow-lg z-50 min-w-48">
          <div className="p-2">
            <div className="text-xs text-vscode-fg-muted mb-2 font-semibold">
              All Status Items
            </div>
            <div className="space-y-1">
              {sortedItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleItemClick(item);
                    setShowAllItems(false);
                  }}
                  className={`w-full text-left px-2 py-1 text-xs hover:bg-vscode-list-hover rounded transition-colors flex items-center space-x-2 ${getColorClass(item.color)}`}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span className="flex-1">{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showAllItems && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAllItems(false)}
        />
      )}
    </div>
  );
};

// Hook for managing status bar items
export const useStatusBar = () => {
  const [items, setItems] = useState<StatusBarItem[]>([]);

  const addItem = useCallback((item: StatusBarItem) => {
    setItems(prev => [...prev.filter(i => i.id !== item.id), item]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<StatusBarItem>) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearItems,
  };
};

// Predefined status bar items
export const createStatusBarItems = {
  notification: (count: number): StatusBarItem => ({
    id: 'notifications',
    text: `${count}`,
    icon: '🔔',
    priority: 60,
    color: count > 0 ? 'warning' : 'default',
    tooltip: `${count} notification${count !== 1 ? 's' : ''}`,
    visible: count > 0,
  }),

  problems: (errors: number, warnings: number): StatusBarItem => ({
    id: 'problems',
    text: `${errors + warnings}`,
    icon: errors > 0 ? '❌' : warnings > 0 ? '⚠️' : '✅',
    priority: 70,
    color: errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'success',
    tooltip: `${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}`,
  }),

  liveShare: (isActive: boolean): StatusBarItem => ({
    id: 'liveShare',
    text: isActive ? 'Live Share' : 'Share',
    icon: isActive ? '👥' : '🔗',
    priority: 40,
    color: isActive ? 'info' : 'default',
    tooltip: isActive ? 'Live Share session active' : 'Start Live Share session',
  }),

  terminal: (count: number): StatusBarItem => ({
    id: 'terminal',
    text: `${count}`,
    icon: '🖥️',
    priority: 30,
    tooltip: `${count} terminal${count !== 1 ? 's' : ''} open`,
    visible: count > 0,
  }),

  ai: (isActive: boolean): StatusBarItem => ({
    id: 'ai',
    text: 'AI',
    icon: '🤖',
    priority: 80,
    color: isActive ? 'success' : 'default',
    tooltip: isActive ? 'AI assistance active' : 'AI assistance disabled',
  }),
}; 