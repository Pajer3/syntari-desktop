// Syntari AI IDE - Output Panel Component
// VS Code-style output panel for build logs, debug output, and console information

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export type OutputLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface OutputEntry {
  id: string;
  timestamp: number;
  level: OutputLevel;
  message: string;
  source: string; // e.g., 'build', 'debug', 'terminal', 'ai-assistant'
  data?: any; // Additional structured data
}

export interface OutputChannel {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  entries: OutputEntry[];
  isActive?: boolean;
}

interface OutputPanelProps {
  channels: OutputChannel[];
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onClearChannel?: (channelId: string) => void;
  onExportLogs?: (channelId: string) => void;
  className?: string;
  maxHeight?: number;
  showTimestamps?: boolean;
  autoScroll?: boolean;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  channels,
  activeChannelId,
  onChannelSelect,
  onClearChannel,
  onExportLogs,
  className = '',
  maxHeight = 400,
  showTimestamps = true,
  autoScroll = true,
}) => {
  const [filterLevel, setFilterLevel] = useState<OutputLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowingOutput, setIsFollowingOutput] = useState(autoScroll);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  
  const outputRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get active channel
  const activeChannel = useMemo(() => {
    return channels.find(channel => channel.id === activeChannelId) || channels[0];
  }, [channels, activeChannelId]);

  // Filter entries based on level and search
  const filteredEntries = useMemo(() => {
    if (!activeChannel) return [];
    
    return activeChannel.entries.filter(entry => {
      // Filter by level
      if (filterLevel !== 'all' && entry.level !== filterLevel) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.message.toLowerCase().includes(query) ||
          entry.source.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [activeChannel, filterLevel, searchQuery]);

  // Count entries by level
  const levelCounts = useMemo(() => {
    if (!activeChannel) return { info: 0, warn: 0, error: 0, debug: 0, success: 0 };
    
    const counts = { info: 0, warn: 0, error: 0, debug: 0, success: 0 };
    activeChannel.entries.forEach(entry => {
      counts[entry.level]++;
    });
    return counts;
  }, [activeChannel]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (isFollowingOutput && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredEntries, isFollowingOutput]);

  // Handle manual scroll - stop following if user scrolls up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    setIsFollowingOutput(isAtBottom);
  }, []);

  // Get level display properties
  const getLevelDisplay = useCallback((level: OutputLevel) => {
    switch (level) {
      case 'error':
        return { icon: '❌', color: 'text-red-400', bgColor: 'bg-red-500/10' };
      case 'warn':
        return { icon: '⚠️', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' };
      case 'success':
        return { icon: '✅', color: 'text-green-400', bgColor: 'bg-green-500/10' };
      case 'debug':
        return { icon: '🐛', color: 'text-purple-400', bgColor: 'bg-purple-500/10' };
      case 'info':
      default:
        return { icon: 'ℹ️', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
    }
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }) + '.' + String(timestamp % 1000).padStart(3, '0');
  }, []);

  // Handle clear channel
  const handleClearChannel = useCallback(() => {
    if (activeChannel && onClearChannel) {
      onClearChannel(activeChannel.id);
    }
  }, [activeChannel, onClearChannel]);

  // Handle export logs
  const handleExportLogs = useCallback(() => {
    if (activeChannel && onExportLogs) {
      onExportLogs(activeChannel.id);
    }
  }, [activeChannel, onExportLogs]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setIsFollowingOutput(true);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (!activeChannel) {
    return (
      <div className={`output-panel bg-vscode-sidebar text-vscode-fg flex items-center justify-center ${className}`}>
        <div className="text-center text-vscode-fg-muted">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-sm">No output channels available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`output-panel bg-vscode-sidebar text-vscode-fg flex flex-col ${className}`}>
      {/* Header */}
      <div className="output-header border-b border-vscode-border p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Output
            </h2>
            
            {/* Channel Selector */}
            <select
              value={activeChannelId || ''}
              onChange={(e) => onChannelSelect(e.target.value)}
              className="px-2 py-1 bg-vscode-input border border-vscode-border rounded text-sm text-vscode-fg focus:outline-none focus:ring-2 focus:ring-vscode-accent"
            >
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>
                  {channel.icon ? `${channel.icon} ` : ''}{channel.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto-scroll toggle */}
            <button
              onClick={() => setIsFollowingOutput(!isFollowingOutput)}
              className={`
                p-1 rounded text-xs transition-colors
                ${isFollowingOutput 
                  ? 'bg-vscode-accent text-white' 
                  : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
                }
              `}
              title={`${isFollowingOutput ? 'Disable' : 'Enable'} auto-scroll`}
            >
              📜
            </button>
            
            {/* Scroll to bottom */}
            <button
              onClick={scrollToBottom}
              className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="Scroll to bottom"
            >
              ⬇️
            </button>
            
            {/* Line numbers toggle */}
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`
                p-1 rounded text-xs transition-colors
                ${showLineNumbers 
                  ? 'bg-vscode-accent text-white' 
                  : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
                }
              `}
              title="Toggle line numbers"
            >
              🔢
            </button>
            
            {/* Clear channel */}
            {onClearChannel && (
              <button
                onClick={handleClearChannel}
                className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
                title="Clear output"
              >
                🗑️
              </button>
            )}
            
            {/* Export logs */}
            {onExportLogs && (
              <button
                onClick={handleExportLogs}
                className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
                title="Export logs"
              >
                💾
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-3 mb-2">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter output..."
              className="w-full px-3 py-1 bg-vscode-input border border-vscode-border rounded text-sm text-vscode-fg placeholder-vscode-fg-muted focus:outline-none focus:ring-2 focus:ring-vscode-accent"
            />
          </div>
          
          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as OutputLevel | 'all')}
            className="px-2 py-1 bg-vscode-input border border-vscode-border rounded text-sm text-vscode-fg focus:outline-none focus:ring-2 focus:ring-vscode-accent"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors ({levelCounts.error})</option>
            <option value="warn">Warnings ({levelCounts.warn})</option>
            <option value="info">Info ({levelCounts.info})</option>
            <option value="success">Success ({levelCounts.success})</option>
            <option value="debug">Debug ({levelCounts.debug})</option>
          </select>
        </div>

        {/* Channel Info */}
        <div className="text-xs text-vscode-fg-muted">
          {activeChannel.description && (
            <div className="mb-1">{activeChannel.description}</div>
          )}
          <div>
            {filteredEntries.length} of {activeChannel.entries.length} entries
            {filterLevel !== 'all' && ` • Filtered by ${filterLevel}`}
            {searchQuery && ` • Search: "${searchQuery}"`}
          </div>
        </div>
      </div>

      {/* Output Content */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto font-mono text-sm"
        style={{ maxHeight: `${maxHeight}px` }}
        onScroll={handleScroll}
      >
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-vscode-fg-muted">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-sm">
              {activeChannel.entries.length === 0 
                ? 'No output yet' 
                : 'No entries match current filters'
              }
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {filteredEntries.map((entry, index) => {
              const { icon, color, bgColor } = getLevelDisplay(entry.level);
              
              return (
                <div
                  key={entry.id}
                  className={`output-entry flex hover:bg-vscode-list-hover transition-colors ${bgColor}`}
                >
                  {/* Line Number */}
                  {showLineNumbers && (
                    <div className="text-vscode-fg-muted text-xs w-12 flex-shrink-0 text-right pr-2 py-1 select-none">
                      {index + 1}
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  {showTimestamps && (
                    <div className="text-vscode-fg-muted text-xs w-24 flex-shrink-0 py-1 select-none">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                  )}
                  
                  {/* Level Icon */}
                  <div className={`${color} w-6 flex-shrink-0 py-1 text-center`}>
                    {icon}
                  </div>
                  
                  {/* Source */}
                  <div className="text-vscode-fg-muted text-xs w-20 flex-shrink-0 py-1 truncate">
                    {entry.source}
                  </div>
                  
                  {/* Message */}
                  <div className="flex-1 py-1 text-vscode-fg whitespace-pre-wrap break-words">
                    {entry.message}
                  </div>
                </div>
              );
            })}
            
            {/* Bottom anchor for auto-scroll */}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="output-footer border-t border-vscode-border px-3 py-2 bg-vscode-bg text-xs text-vscode-fg-muted">
        <div className="flex items-center justify-between">
          <div>
            Channel: {activeChannel.name}
            {activeChannel.entries.length > 0 && (
              <span className="ml-2">
                Last update: {formatTimestamp(activeChannel.entries[activeChannel.entries.length - 1]?.timestamp || Date.now())}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!isFollowingOutput && (
              <span className="text-yellow-400">Auto-scroll disabled</span>
            )}
            <span>
              {filterLevel !== 'all' && `${filterLevel.toUpperCase()} • `}
              {filteredEntries.length} visible
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 