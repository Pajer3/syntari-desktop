// Syntari AI IDE - Search Result Item Component
// Individual search result with syntax highlighting and navigation

import React, { useCallback, useMemo } from 'react';
import type { SearchMatch } from './useProjectSearch';

interface SearchResultProps {
  match: SearchMatch;
  searchQuery: string;
  onNavigateToMatch: (file: string, line: number, column: number) => void;
  isRegex?: boolean;
}

export const SearchResult: React.FC<SearchResultProps> = ({
  match,
  searchQuery: _searchQuery,
  onNavigateToMatch,
  isRegex: _isRegex = false,
}) => {
  const handleClick = useCallback(() => {
    onNavigateToMatch(match.file, match.line, match.column);
  }, [match.file, match.line, match.column, onNavigateToMatch]);

  // Highlight the search term in the text
  const highlightedText = useMemo(() => {
    const { text, matchStart, matchEnd } = match;
    
    if (matchStart < 0 || matchEnd <= matchStart || matchEnd > text.length) {
      return text;
    }

    const before = text.substring(0, matchStart);
    const highlighted = text.substring(matchStart, matchEnd);
    const after = text.substring(matchEnd);

    return {
      before,
      highlighted,
      after,
    };
  }, [match]);

  // Get just the filename from the full path
  const fileName = useMemo(() => {
    return match.file.split('/').pop() || match.file;
  }, [match.file]);

  // Get the directory path
  const directory = useMemo(() => {
    const parts = match.file.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  }, [match.file]);

  return (
    <div
      onClick={handleClick}
      className="search-result-item px-3 py-2 hover:bg-vscode-list-hover cursor-pointer border-l-2 border-transparent hover:border-vscode-accent transition-colors group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* File Info */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-vscode-fg font-medium text-sm truncate">
            {fileName}
          </span>
          {directory && (
            <span className="text-vscode-fg-muted text-xs truncate">
              {directory}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-vscode-fg-muted">
          <span>Line {match.line}</span>
          <span>Col {match.column}</span>
        </div>
      </div>

      {/* Code Preview */}
      <div className="code-preview">
        <div className="flex items-center space-x-2">
          {/* Line Number */}
          <span className="text-vscode-fg-muted text-xs font-mono w-12 text-right flex-shrink-0">
            {match.line}:
          </span>
          
          {/* Code Content */}
          <div className="font-mono text-sm text-vscode-fg leading-relaxed min-w-0">
            {typeof highlightedText === 'string' ? (
              <span>{highlightedText}</span>
            ) : (
              <>
                <span>{highlightedText.before}</span>
                <span className="bg-yellow-400 text-black px-1 rounded">
                  {highlightedText.highlighted}
                </span>
                <span>{highlightedText.after}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hover Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 top-1/2 transform -translate-y-1/2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Copy match to clipboard
            navigator.clipboard.writeText(match.text.trim());
          }}
          className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover"
          title="Copy line"
        >
          📋
        </button>
      </div>
    </div>
  );
}; 