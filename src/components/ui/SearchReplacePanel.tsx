// Syntari AI IDE - Enhanced Search & Replace Panel Component
// Professional VS Code-style search and replace with Tauri backend integration

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Replace, X, ChevronDown, ChevronRight, FileText, Settings, History, Sparkles } from 'lucide-react';
import { searchService } from '../../services';
import type { SearchResult, SearchOptions } from '../../services/types';

interface SearchReplaceGroup {
  file: string;
  results: SearchResult[];
  expanded: boolean;
}

interface SearchReplacePanelProps {
  onNavigateToResult: (result: SearchResult) => void;
  onReplaceInFile: (file: string, replacements: { line: number; column: number; oldText: string; newText: string }[]) => Promise<void>;
  onReplaceAll: (query: string, replacement: string, options: SearchOptions) => Promise<number>;
  onClose: () => void;
  className?: string;
}

export const SearchReplacePanel: React.FC<SearchReplacePanelProps> = ({
  onNavigateToResult,
  onReplaceInFile,
  onReplaceAll,
  onClose,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchReplaceGroup[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [options, setOptions] = useState<SearchOptions>({
    query: searchQuery,
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includePatterns: ['**/*'],
    excludePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Real search function using Tauri backend
  const performSearch = useCallback(async (query: string, searchOptions: SearchOptions): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const results = await searchService.searchInProject({
        ...searchOptions,
        query
      });
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setTotalMatches(0);
      return;
    }

    setIsSearching(true);
    
    try {
      const results = await performSearch(searchQuery, options);
      
      // Group results by file
      const groupedResults = results.reduce((groups, result) => {
        const existingGroup = groups.find(g => g.file === result.file);
        if (existingGroup) {
          existingGroup.results.push(result);
        } else {
          groups.push({
            file: result.file,
            results: [result],
            expanded: true
          });
        }
        return groups;
      }, [] as SearchReplaceGroup[]);

      setSearchResults(groupedResults);
      setTotalMatches(results.length);

      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]); // Keep last 10 searches
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, options, performSearch, searchHistory]);

  const handleReplaceInFile = useCallback(async (file: string) => {
    if (!replaceQuery && replaceQuery !== '') return;

    const fileGroup = searchResults.find(g => g.file === file);
    if (!fileGroup) return;

    const replacements = fileGroup.results.map(result => ({
      line: result.line,
      column: result.column,
      oldText: result.match,
      newText: replaceQuery
    }));

    try {
      await onReplaceInFile(file, replacements);
      
      // Remove replaced results from the list
      setSearchResults(prev => prev.filter(g => g.file !== file));
      setTotalMatches(prev => prev - fileGroup.results.length);
    } catch (error) {
      console.error('Replace failed:', error);
    }
  }, [replaceQuery, searchResults, onReplaceInFile]);

  const handleReplaceAll = useCallback(async () => {
    if (!replaceQuery && replaceQuery !== '') return;

    try {
      const replacedCount = await onReplaceAll(searchQuery, replaceQuery, options);
      
      // Clear results after replace all
      setSearchResults([]);
      setTotalMatches(0);
      
      console.log(`Replaced ${replacedCount} occurrences`);
    } catch (error) {
      console.error('Replace all failed:', error);
    }
  }, [searchQuery, replaceQuery, options, onReplaceAll]);

  const toggleFileGroup = useCallback((file: string) => {
    setSearchResults(prev => prev.map(group => 
      group.file === file 
        ? { ...group, expanded: !group.expanded }
        : group
    ));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSearch, onClose]);

  const getAISearchSuggestions = useCallback(() => {
    // AI-powered search suggestions based on context
    const suggestions = [
      'TODO|FIXME|HACK',
      'console\\.log\\(',
      'function\\s+\\w+\\(',
      'import.*from',
      'export.*{',
      'interface\\s+\\w+',
      'class\\s+\\w+',
      'const\\s+\\w+\\s*=',
    ];
    
    return suggestions;
  }, []);

  return (
    <div className={`h-full bg-vscode-sidebar border-l border-vscode-border flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-vscode-border">
        <div className="flex items-center space-x-2">
          <Search size={16} className="text-vscode-fg" />
          <h2 className="text-sm font-semibold text-vscode-fg uppercase tracking-wide">
            Search & Replace
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-vscode-fg hover:bg-vscode-list-hover rounded transition-colors"
          title="Close Search Panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 space-y-3">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="
              w-full px-3 py-2 pr-20 bg-vscode-input border border-vscode-border rounded
              text-vscode-fg placeholder-vscode-fg-muted text-sm
              focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-transparent
            "
          />
          
          {/* Search Options Buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1 rounded text-xs transition-colors ${
                showHistory ? 'bg-vscode-accent text-white' : 'text-vscode-fg hover:bg-vscode-list-hover'
              }`}
              title="Search History"
            >
              <History size={12} />
            </button>
            
            <button
              onClick={() => {
                const suggestions = getAISearchSuggestions();
                const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                setSearchQuery(randomSuggestion);
                setOptions(prev => ({ ...prev, regex: true }));
              }}
              className="p-1 rounded text-xs text-vscode-fg hover:bg-vscode-list-hover transition-colors"
              title="AI Search Suggestions"
            >
              <Sparkles size={12} />
            </button>
          </div>
        </div>

        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div className="bg-vscode-dropdown border border-vscode-border rounded shadow-lg max-h-32 overflow-y-auto">
            {searchHistory.map((query, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(query);
                  setShowHistory(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-vscode-fg hover:bg-vscode-list-hover transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        )}

        {/* Replace Input */}
        {isReplaceMode && (
          <div className="relative">
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Replace..."
              className="
                w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded
                text-vscode-fg placeholder-vscode-fg-muted text-sm
                focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-transparent
              "
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="
              flex-1 px-3 py-2 bg-vscode-accent text-white rounded text-sm
              hover:bg-vscode-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>

          <button
            onClick={() => setIsReplaceMode(!isReplaceMode)}
            className={`
              px-3 py-2 rounded text-sm transition-colors
              ${isReplaceMode 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
              }
            `}
            title={isReplaceMode ? 'Hide Replace' : 'Show Replace'}
          >
            <Replace size={14} />
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`
              px-3 py-2 rounded text-sm transition-colors
              ${showAdvanced 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
              }
            `}
            title="Advanced Options"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Replace Actions */}
        {isReplaceMode && searchResults.length > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={handleReplaceAll}
              className="
                flex-1 px-3 py-2 bg-orange-600 text-white rounded text-sm
                hover:bg-orange-700 transition-colors
              "
            >
              Replace All ({totalMatches})
            </button>
          </div>
        )}

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-3 p-3 bg-vscode-bg border border-vscode-border rounded">
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={options.caseSensitive}
                  onChange={(e) => setOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-vscode-fg">Aa</span>
              </label>
              
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={options.wholeWord}
                  onChange={(e) => setOptions(prev => ({ ...prev, wholeWord: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-vscode-fg">Ab</span>
              </label>
              
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={options.useRegex}
                  onChange={(e) => setOptions(prev => ({ ...prev, useRegex: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-vscode-fg">.*</span>
              </label>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={options.includePatterns?.join(',') || ''}
                onChange={(e) => setOptions(prev => ({ ...prev, includePatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                placeholder="Files to include"
                className="
                  w-full px-2 py-1 bg-vscode-input border border-vscode-border rounded
                  text-vscode-fg placeholder-vscode-fg-muted text-xs
                  focus:outline-none focus:ring-1 focus:ring-vscode-accent
                "
              />
              
              <input
                type="text"
                value={options.excludePatterns?.join(',') || ''}
                onChange={(e) => setOptions(prev => ({ ...prev, excludePatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                placeholder="Files to exclude"
                className="
                  w-full px-2 py-1 bg-vscode-input border border-vscode-border rounded
                  text-vscode-fg placeholder-vscode-fg-muted text-xs
                  focus:outline-none focus:ring-1 focus:ring-vscode-accent
                "
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto ide-scrollbar">
        {searchResults.length > 0 && (
          <div className="p-3">
            <div className="text-xs text-vscode-fg-muted mb-3">
              {totalMatches} results in {searchResults.length} files
            </div>

            {searchResults.map((group) => (
              <div key={group.file} className="mb-4">
                {/* File Header */}
                <div 
                  className="flex items-center justify-between p-2 bg-vscode-bg border border-vscode-border rounded cursor-pointer hover:bg-vscode-list-hover transition-colors"
                  onClick={() => toggleFileGroup(group.file)}
                >
                  <div className="flex items-center space-x-2">
                    {group.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <FileText size={14} className="text-vscode-fg-muted" />
                    <span className="text-sm text-vscode-fg font-medium">
                      {group.file.split('/').pop()}
                    </span>
                    <span className="text-xs text-vscode-fg-muted">
                      ({group.results.length})
                    </span>
                  </div>

                  {isReplaceMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplaceInFile(group.file);
                      }}
                      className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                    >
                      Replace
                    </button>
                  )}
                </div>

                {/* File Results */}
                {group.expanded && (
                  <div className="ml-4 mt-2 space-y-1">
                    {group.results.map((result, index) => (
                      <div
                        key={index}
                        className="p-2 bg-vscode-editor border border-vscode-border rounded cursor-pointer hover:bg-vscode-list-hover transition-colors"
                        onClick={() => onNavigateToResult(result)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-vscode-fg-muted">
                            Line {result.line}, Column {result.column}
                          </span>
                        </div>
                        <div className="text-sm text-vscode-fg font-mono">
                          {result.preview || result.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {searchQuery && !isSearching && searchResults.length === 0 && (
          <div className="p-8 text-center">
            <Search size={48} className="mx-auto text-vscode-fg-muted opacity-50 mb-4" />
            <p className="text-vscode-fg-muted">No results found for "{searchQuery}"</p>
            <p className="text-xs text-vscode-fg-muted mt-2">
              Try adjusting your search options or using different keywords
            </p>
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && (
          <div className="p-8 text-center">
            <Search size={48} className="mx-auto text-vscode-fg-muted opacity-50 mb-4" />
            <p className="text-vscode-fg-muted">Enter a search query to find text across your project</p>
            <div className="mt-4 text-xs text-vscode-fg-muted space-y-1">
              <p><kbd className="px-1 bg-vscode-keybinding-bg rounded">Enter</kbd> to search</p>
              <p><kbd className="px-1 bg-vscode-keybinding-bg rounded">Esc</kbd> to close</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};