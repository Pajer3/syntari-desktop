// Syntari AI IDE - Project Search Hook
// Core search functionality for project-wide search

import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface SearchMatch {
  file: string;
  line: number;
  column: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResult {
  file: string;
  matches: SearchMatch[];
  totalMatches: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includeFileTypes: string[];
  excludeFileTypes: string[];
  excludeDirectories: string[];
}

interface SearchProgress {
  filesSearched: number;
  totalFiles: number;
  currentFile: string;
}

interface ProjectSearchHookResult {
  results: SearchResult[];
  isSearching: boolean;
  searchProgress: SearchProgress | null;
  totalMatches: number;
  searchQuery: string;
  searchOptions: SearchOptions;
  performSearch: (query: string, options?: Partial<SearchOptions>) => Promise<void>;
  cancelSearch: () => void;
  clearResults: () => void;
  updateSearchOptions: (options: Partial<SearchOptions>) => void;
}

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  includeFileTypes: [],
  excludeFileTypes: [
    // Build/dist artifacts
    '.log', '.tmp', '.cache', '.lock', '.tsbuildinfo',
    // IDE/editor files
    '.git', '.node_modules', '.sublime-project', '.sublime-workspace', 
    '.vscode', '.idea', '.history', '.vs',
    // Archives & binaries
    '.zip', '.tar', '.gz', '.rar', '.7z', '.exe', '.dll', '.so', '.dylib',
    // Images & media
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.mp4', '.avi',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Package files
    '.min.js', '.min.css', '.bundle.js', '.chunk.js',
    // Database & data files
    '.db', '.sqlite', '.sql', '.dump'
  ],
  excludeDirectories: [
    // Build outputs
    'node_modules', '.git', 'dist', 'build', 'target', '.cache', 
    '.parcel-cache', '.turbo', '.eslintcache', '.next', '.nuxt',
    // IDE directories
    '.vscode', '.idea', '.history', '__MACOSX', '.vs',
    // Version control
    '.github', '.gitlab', '.circleci', '.svn',
    // Language-specific
    '__pycache__', '.pytest_cache', '.mypy_cache', '.venv', 'venv',
    '.gradle', '.m2', 'vendor', 'Pods',
    // OS & temp
    '.DS_Store', 'Thumbs.db', 'temp', 'tmp'
  ],
};

export const useProjectSearch = (projectPath: string): ProjectSearchHookResult => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [totalMatches, setTotalMatches] = useState(0);
  
  const searchAbortController = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<number>();

  const cancelSearch = useCallback(() => {
    if (searchAbortController.current) {
      searchAbortController.current.abort();
      searchAbortController.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = undefined;
    }
    setIsSearching(false);
    setSearchProgress(null);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotalMatches(0);
    setSearchQuery('');
    setSearchProgress(null);
  }, []);

  const updateSearchOptions = useCallback((options: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...options }));
  }, []);

  const performSearch = useCallback(async (
    query: string, 
    optionOverrides?: Partial<SearchOptions>
  ) => {
    // Don't search if query is too short or empty
    if (!query.trim() || query.trim().length < 2 || !projectPath) {
      clearResults();
      return;
    }

    // Cancel any ongoing search immediately
    cancelSearch();

    const finalOptions = { ...searchOptions, ...optionOverrides };
    
    setSearchQuery(query);
    setIsSearching(true);
    setResults([]);
    setTotalMatches(0);
    setSearchProgress({ filesSearched: 0, totalFiles: 0, currentFile: 'Starting...' });

    // Create new abort controller for this search
    searchAbortController.current = new AbortController();

    try {
      // Use streaming search with smaller chunks for better responsiveness
      const searchResults = await invoke<{
        success: boolean;
        data?: {
          results: SearchResult[];
          totalMatches: number;
          filesSearched: number;
          totalFiles: number;
        };
        error?: string;
      }>('search_in_project_streaming', {
        projectPath,
        query: query.trim(),
        options: finalOptions,
        maxResults: 50, // Reduced for better performance
      });

      // Check if search was cancelled during the async operation
      if (searchAbortController.current?.signal.aborted) {
        console.log('Search was cancelled during execution');
        return;
      }

      if (searchResults.success && searchResults.data) {
        // Only update state if search wasn't cancelled
        if (!searchAbortController.current?.signal.aborted) {
          setResults(searchResults.data.results);
          setTotalMatches(searchResults.data.totalMatches);
          setSearchProgress({
            filesSearched: searchResults.data.filesSearched,
            totalFiles: searchResults.data.totalFiles,
            currentFile: searchResults.data.totalMatches > 50 ? 'Showing first 50 results' : 'Complete',
          });
        }
      } else {
        console.error('Search failed:', searchResults.error);
        if (!searchAbortController.current?.signal.aborted) {
          setResults([]);
          setTotalMatches(0);
        }
      }
    } catch (error) {
      if (!searchAbortController.current?.signal.aborted) {
        console.error('Search error:', error);
        setResults([]);
        setTotalMatches(0);
        
        // Fallback to regular search if streaming fails (with smaller limits)
        try {
          const fallbackResults = await invoke<{
            success: boolean;
            data?: {
              results: SearchResult[];
              totalMatches: number;
              filesSearched: number;
              totalFiles: number;
            };
            error?: string;
          }>('search_in_project', {
            projectPath,
            query: query.trim(),
            options: finalOptions,
          });

          // Check again if search was cancelled during fallback
          if (searchAbortController.current?.signal.aborted) {
            return;
          }

          if (fallbackResults.success && fallbackResults.data) {
            setResults(fallbackResults.data.results.slice(0, 25)); // Even smaller limit for fallback
            setTotalMatches(fallbackResults.data.totalMatches);
            setSearchProgress({
              filesSearched: fallbackResults.data.filesSearched,
              totalFiles: fallbackResults.data.totalFiles,
              currentFile: 'Complete (fallback)',
            });
          }
        } catch (fallbackError) {
          if (!searchAbortController.current?.signal.aborted) {
            console.error('Fallback search also failed:', fallbackError);
          }
        }
      }
    } finally {
      // Only update search state if not cancelled
      if (!searchAbortController.current?.signal.aborted) {
        setIsSearching(false);
        // Hide progress after a short delay
        setTimeout(() => {
          if (!searchAbortController.current?.signal.aborted) {
            setSearchProgress(null);
          }
        }, 2000); // Reduced delay
      }
    }
  }, [projectPath, searchOptions, cancelSearch, clearResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSearch();
    };
  }, [cancelSearch]);

  return {
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
  };
}; 