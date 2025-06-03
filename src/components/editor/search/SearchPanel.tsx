// Syntari AI IDE - Search Panel Component
// Main search panel combining input and results

import React, { useCallback, useEffect, useRef } from 'react';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useProjectSearch } from './useProjectSearch';

interface SearchPanelProps {
  projectPath: string;
  onNavigateToFile: (file: string, line?: number, column?: number) => void;
  className?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  projectPath,
  onNavigateToFile,
  className = '',
  isVisible = true,
  onToggleVisibility,
}) => {
  const searchPanelRef = useRef<HTMLDivElement>(null);
  
  const {
    results,
    isSearching,
    searchProgress,
    totalMatches,
    searchQuery,
    searchOptions,
    performSearch,
    cancelSearch,
    clearResults,
    updateSearchOptions,
  } = useProjectSearch(projectPath);

  // Handle navigation to search results
  const handleNavigateToMatch = useCallback((file: string, line: number, column: number) => {
    onNavigateToFile(file, line, column);
  }, [onNavigateToFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+F to focus search
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        if (onToggleVisibility && !isVisible) {
          onToggleVisibility();
        }
        // Focus the search input
        const searchInput = searchPanelRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Escape to close search panel
      if (e.key === 'Escape' && isVisible) {
        const focusedElement = document.activeElement;
        const isInSearchPanel = searchPanelRef.current?.contains(focusedElement);
        
        if (isInSearchPanel) {
          if (isSearching) {
            cancelSearch();
          } else if (onToggleVisibility) {
            onToggleVisibility();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isSearching, onToggleVisibility, cancelSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSearch();
    };
  }, [cancelSearch]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={searchPanelRef}
      className={`search-panel bg-vscode-sidebar border-r border-vscode-border flex flex-col h-full ${className}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-vscode-border">
        <h2 className="text-sm font-semibold text-vscode-fg uppercase tracking-wide">
          Search
        </h2>
        
        <div className="flex items-center space-x-1">
          {/* Clear Results */}
          {(results.length > 0 || searchQuery) && (
            <button
              onClick={clearResults}
              className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="Clear search results"
            >
              🗑️
            </button>
          )}
          
          {/* Close Panel */}
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="Close search panel (Esc)"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <SearchInput
        onSearch={performSearch}
        onOptionsChange={updateSearchOptions}
        searchOptions={searchOptions}
        isSearching={isSearching}
        onCancel={cancelSearch}
      />

      {/* Search Results */}
      <div className="flex-1 overflow-hidden">
        <SearchResults
          results={results}
          searchQuery={searchQuery}
          totalMatches={totalMatches}
          isSearching={isSearching}
          searchProgress={searchProgress}
          onNavigateToMatch={handleNavigateToMatch}
          isRegex={searchOptions.useRegex}
        />
      </div>

      {/* Footer with Stats */}
      {!isSearching && results.length > 0 && (
        <div className="border-t border-vscode-border p-2 bg-vscode-bg">
          <div className="text-xs text-vscode-fg-muted text-center">
            Search completed • {totalMatches} matches in {results.length} files
          </div>
        </div>
      )}
    </div>
  );
}; 