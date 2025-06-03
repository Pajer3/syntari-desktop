// Syntari AI IDE - Search Input Component
// Search input with options and debounced search

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { SearchOptions } from './useProjectSearch';

interface SearchInputProps {
  onSearch: (query: string) => void;
  onOptionsChange: (options: Partial<SearchOptions>) => void;
  searchOptions: SearchOptions;
  isSearching: boolean;
  onCancel: () => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onOptionsChange,
  searchOptions,
  isSearching,
  onCancel,
  placeholder = "Search in files...",
  debounceMs = 800,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [includeTypes, setIncludeTypes] = useState(searchOptions.includeFileTypes.join(', '));
  const [excludeTypes, setExcludeTypes] = useState(searchOptions.excludeFileTypes.join(', '));
  
  const debounceTimeoutRef = useRef<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Improved debounced search that never blocks typing
  useEffect(() => {
    // Always clear previous timeout immediately
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const trimmedValue = inputValue.trim();
    
    // Clear results immediately when input is empty
    if (trimmedValue.length === 0) {
      onCancel();
      return;
    }
    
    // Only search after user pauses for 1 second AND has at least 2 characters
    if (trimmedValue.length >= 1) {
      debounceTimeoutRef.current = window.setTimeout(() => {
        // Double-check the input hasn't changed during the timeout
        if (inputRef.current && inputRef.current.value.trim() === trimmedValue) {
          onSearch(trimmedValue);
        }
      }, debounceMs);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [inputValue, onSearch, debounceMs, onCancel]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Cancel any ongoing search immediately when user types
    if (isSearching) {
      onCancel();
    }
  }, [isSearching, onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim() && inputValue.trim().length >= 1) {
        // Cancel debounce and search immediately
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        onSearch(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isSearching) {
        onCancel();
      } else {
        setInputValue('');
        inputRef.current?.blur();
      }
    }
  }, [inputValue, onSearch, isSearching, onCancel]);

  const handleOptionChange = useCallback((option: keyof SearchOptions, value: boolean) => {
    onOptionsChange({ [option]: value });
  }, [onOptionsChange]);

  const handleFileTypesChange = useCallback((type: 'include' | 'exclude', value: string) => {
    const types = value.split(',').map(t => t.trim()).filter(t => t);
    
    if (type === 'include') {
      setIncludeTypes(value);
      onOptionsChange({ includeFileTypes: types });
    } else {
      setExcludeTypes(value);
      onOptionsChange({ excludeFileTypes: types });
    }
  }, [onOptionsChange]);

  const handleClearSearch = useCallback(() => {
    setInputValue('');
    onCancel();
    inputRef.current?.focus();
  }, [onCancel]);

  return (
    <div className="search-input-container bg-vscode-sidebar border-b border-vscode-border">
      {/* Main Search Input */}
      <div className="flex items-center p-3 space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-vscode-input text-vscode-fg border border-vscode-border rounded text-sm focus:outline-none focus:border-vscode-accent"
            // NEVER disable input - this was causing the blocking feeling
          />
          
          {/* Character counter and requirements - only show if needed */}
          {inputValue.length > 0 && inputValue.length < 2 && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-vscode-fg-muted">
              {2 - inputValue.length} more
            </div>
          )}
          
          {/* Clear button */}
          {inputValue && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-vscode-fg-muted hover:text-vscode-fg text-xs"
              title="Clear search"
              style={{ right: inputValue.length > 0 && inputValue.length < 2 ? '60px' : '8px' }}
            >
              ×
            </button>
          )}
        </div>

        {/* Search Options Toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`p-2 rounded text-xs transition-colors ${
            showOptions 
              ? 'bg-vscode-accent text-white' 
              : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
          }`}
          title="Search options"
        >
          ⚙️
        </button>

        {/* Cancel Search - always available when searching */}
        {isSearching && (
          <button
            onClick={onCancel}
            className="p-2 rounded text-xs bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Cancel search"
          >
            ⏹
          </button>
        )}
      </div>

      {/* Search Options Panel */}
      {showOptions && (
        <div className="border-t border-vscode-border bg-vscode-bg p-3 space-y-3">
          {/* Boolean Options */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={searchOptions.caseSensitive}
                onChange={(e) => handleOptionChange('caseSensitive', e.target.checked)}
                className="rounded"
              />
              <span className="text-vscode-fg">Case sensitive</span>
            </label>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={searchOptions.wholeWord}
                onChange={(e) => handleOptionChange('wholeWord', e.target.checked)}
                className="rounded"
              />
              <span className="text-vscode-fg">Whole word</span>
            </label>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={searchOptions.useRegex}
                onChange={(e) => handleOptionChange('useRegex', e.target.checked)}
                className="rounded"
              />
              <span className="text-vscode-fg">Use regex</span>
            </label>
          </div>

          {/* File Type Filters */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-vscode-fg-muted mb-1">
                Include file types (comma-separated):
              </label>
              <input
                type="text"
                value={includeTypes}
                onChange={(e) => handleFileTypesChange('include', e.target.value)}
                placeholder="e.g., .js, .ts, .py"
                className="w-full px-2 py-1 bg-vscode-input text-vscode-fg border border-vscode-border rounded text-xs focus:outline-none focus:border-vscode-accent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-vscode-fg-muted mb-1">
                Exclude file types (comma-separated):
              </label>
              <input
                type="text"
                value={excludeTypes}
                onChange={(e) => handleFileTypesChange('exclude', e.target.value)}
                placeholder="e.g., .log, .tmp, .cache"
                className="w-full px-2 py-1 bg-vscode-input text-vscode-fg border border-vscode-border rounded text-xs focus:outline-none focus:border-vscode-accent"
              />
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => handleFileTypesChange('include', '.js, .ts, .jsx, .tsx')}
              className="px-2 py-1 text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover rounded"
            >
              JS/TS Files
            </button>
            <button
              onClick={() => handleFileTypesChange('include', '.py, .pyi')}
              className="px-2 py-1 text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover rounded"
            >
              Python Files
            </button>
            <button
              onClick={() => handleFileTypesChange('include', '.rs, .toml')}
              className="px-2 py-1 text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover rounded"
            >
              Rust Files
            </button>
            <button
              onClick={() => handleFileTypesChange('exclude', '')}
              className="px-2 py-1 text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover rounded"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 