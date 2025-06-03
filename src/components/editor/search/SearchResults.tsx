// Syntari AI IDE - Search Results Container Component
// Groups and displays search results with file organization and stats

import React, { useState, useMemo, useCallback } from 'react';
import { SearchResult } from './SearchResult';
import type { SearchResult as SearchResultType } from './useProjectSearch';

interface SearchResultsProps {
  results: SearchResultType[];
  searchQuery: string;
  totalMatches: number;
  isSearching: boolean;
  searchProgress: { filesSearched: number; totalFiles: number; currentFile: string } | null;
  onNavigateToMatch: (file: string, line: number, column: number) => void;
  isRegex?: boolean;
}

interface FileGroupState {
  [filePath: string]: boolean; // expanded state
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchQuery,
  totalMatches,
  isSearching,
  searchProgress,
  onNavigateToMatch,
  isRegex = false,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<FileGroupState>({});
  const [selectedMatch, setSelectedMatch] = useState<{file: string; line: number} | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);

  // Limit initial results for performance - reduced for better responsiveness
  const INITIAL_RESULTS_LIMIT = 5; // Reduced from 10 to 5 for faster initial render
  const displayResults = showAllResults ? results : results.slice(0, INITIAL_RESULTS_LIMIT);
  const hasMoreResults = results.length > INITIAL_RESULTS_LIMIT;

  // Auto-expand files on search (but limit to first few for performance)
  React.useEffect(() => {
    if (results.length > 0) {
      const newExpandedState: FileGroupState = {};
      results.slice(0, 3).forEach(result => { // Only auto-expand first 3 files (reduced from 5)
        // Auto-expand files with fewer matches or if only a few files
        if (result.matches.length <= 3 || results.length <= 2) {
          newExpandedState[result.file] = true;
        } else {
          newExpandedState[result.file] = false;
        }
      });
      setExpandedFiles(newExpandedState);
    }
  }, [results]);

  const toggleFileExpansion = useCallback((filePath: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  }, []);

  const handleNavigateToMatch = useCallback((file: string, line: number, column: number) => {
    setSelectedMatch({ file, line });
    onNavigateToMatch(file, line, column);
  }, [onNavigateToMatch]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalFiles = results.length;
    const averageMatches = totalFiles > 0 ? Math.round(totalMatches / totalFiles * 10) / 10 : 0;
    
    return {
      totalFiles,
      totalMatches,
      averageMatches,
    };
  }, [results.length, totalMatches]);

  if (isSearching && (!results.length || searchProgress)) {
    return (
      <div className="search-results-container bg-vscode-bg h-full flex flex-col">
        {/* Search Progress */}
        <div className="p-4 border-b border-vscode-border">
          <div className="flex items-center space-x-3">
            <div className="animate-spin w-4 h-4 border-2 border-vscode-accent border-t-transparent rounded-full"></div>
            <div className="text-sm text-vscode-fg">
              {searchProgress ? (
                <div>
                  <div>Searching... {searchProgress.filesSearched} of {searchProgress.totalFiles} files</div>
                  {searchProgress.currentFile && searchProgress.currentFile !== 'Complete' && (
                    <div className="text-xs text-vscode-fg-muted truncate mt-1">
                      {searchProgress.currentFile}
                    </div>
                  )}
                </div>
              ) : (
                'Starting search...'
              )}
            </div>
          </div>
          
          {searchProgress && searchProgress.totalFiles > 0 && (
            <div className="mt-2 bg-vscode-sidebar rounded-full h-1 overflow-hidden">
              <div 
                className="bg-vscode-accent h-full transition-all duration-300"
                style={{ 
                  width: `${(searchProgress.filesSearched / searchProgress.totalFiles) * 100}%` 
                }}
              />
            </div>
          )}
        </div>

        {/* Partial Results */}
        {results.length > 0 && (
          <div className="flex-1 overflow-auto">
            <div className="p-3 text-xs text-vscode-fg-muted border-b border-vscode-border">
              Partial results ({totalMatches} matches so far)
            </div>
            {/* Render partial results */}
            {results.map((result) => (
              <FileResultGroup
                key={result.file}
                result={result}
                searchQuery={searchQuery}
                isExpanded={expandedFiles[result.file] ?? false}
                onToggleExpansion={() => toggleFileExpansion(result.file)}
                onNavigateToMatch={handleNavigateToMatch}
                selectedMatch={selectedMatch}
                isRegex={isRegex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!searchQuery.trim()) {
    return (
      <div className="search-results-container bg-vscode-bg h-full flex items-center justify-center">
        <div className="text-center text-vscode-fg-muted">
          <div className="text-lg mb-2">🔍</div>
          <div>Start typing to search across all files</div>
          <div className="text-xs mt-2">Use Ctrl+Shift+F to focus search</div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-results-container bg-vscode-bg h-full flex items-center justify-center">
        <div className="text-center text-vscode-fg-muted">
          <div className="text-lg mb-2">📭</div>
          <div>No results found for "{searchQuery}"</div>
          <div className="text-xs mt-2">Try different search terms or check your filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-container bg-vscode-bg h-full flex flex-col">
      {/* Results Header */}
      <div className="p-3 border-b border-vscode-border bg-vscode-sidebar">
        <div className="flex items-center justify-between">
          <div className="text-sm text-vscode-fg">
            <span className="font-semibold">{stats.totalMatches}</span> results in{' '}
            <span className="font-semibold">{stats.totalFiles}</span> files
            {hasMoreResults && !showAllResults && (
              <span className="text-vscode-fg-muted ml-2">
                (showing first {INITIAL_RESULTS_LIMIT})
              </span>
            )}
          </div>
          <div className="text-xs text-vscode-fg-muted">
            {stats.averageMatches} avg/file
          </div>
        </div>
        
        {/* Query Display */}
        <div className="mt-2 text-xs text-vscode-fg-muted">
          <span className="font-mono bg-vscode-input px-2 py-1 rounded">
            {searchQuery}
          </span>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-auto">
        {displayResults.map((result) => (
          <FileResultGroup
            key={result.file}
            result={result}
            searchQuery={searchQuery}
            isExpanded={expandedFiles[result.file] ?? false}
            onToggleExpansion={() => toggleFileExpansion(result.file)}
            onNavigateToMatch={handleNavigateToMatch}
            selectedMatch={selectedMatch}
            isRegex={isRegex}
          />
        ))}
        
        {/* Show More Button */}
        {hasMoreResults && !showAllResults && (
          <div className="p-4 text-center border-t border-vscode-border">
            <button
              onClick={() => setShowAllResults(true)}
              className="px-4 py-2 bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover rounded transition-colors"
            >
              Show {results.length - INITIAL_RESULTS_LIMIT} more files
            </button>
          </div>
        )}
        
        {/* Performance notice for large result sets */}
        {results.length > 50 && showAllResults && (
          <div className="p-3 text-xs text-vscode-fg-muted bg-vscode-sidebar border-t border-vscode-border">
            💡 Large result set ({results.length} files). Consider refining your search for better performance.
          </div>
        )}
      </div>
    </div>
  );
};

// File Group Component
interface FileResultGroupProps {
  result: SearchResultType;
  searchQuery: string;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onNavigateToMatch: (file: string, line: number, column: number) => void;
  selectedMatch: {file: string; line: number} | null;
  isRegex: boolean;
}

const FileResultGroup: React.FC<FileResultGroupProps> = ({
  result,
  searchQuery,
  isExpanded,
  onToggleExpansion,
  onNavigateToMatch,
  selectedMatch,
  isRegex,
}) => {
  const fileName = result.file.split('/').pop() || result.file;
  const directory = result.file.split('/').slice(0, -1).join('/');

  return (
    <div className="file-result-group border-b border-vscode-border last:border-b-0">
      {/* File Header */}
      <div
        onClick={onToggleExpansion}
        className="flex items-center justify-between p-3 hover:bg-vscode-list-hover cursor-pointer"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </div>
          <div className="min-w-0">
            <div className="text-sm text-vscode-fg font-medium truncate">
              {fileName}
            </div>
            {directory && (
              <div className="text-xs text-vscode-fg-muted truncate">
                {directory}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-vscode-fg-muted">
          <span>{result.matches.length} matches</span>
        </div>
      </div>

      {/* Matches List */}
      {isExpanded && (
        <div className="bg-vscode-bg">
          {result.matches.map((match, index) => (
            <div
              key={`${match.line}-${match.column}-${index}`}
              className={selectedMatch?.file === result.file && selectedMatch?.line === match.line 
                ? 'bg-vscode-accent bg-opacity-20' 
                : ''
              }
            >
              <SearchResult
                match={match}
                searchQuery={searchQuery}
                onNavigateToMatch={onNavigateToMatch}
                isRegex={isRegex}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 