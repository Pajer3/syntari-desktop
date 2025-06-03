// Syntari AI IDE - Quick Open Dialog (Ctrl+P)
// VS Code-style fuzzy file search with on-demand loading

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { FileNode } from '../types/fileSystem';
import { fileSystemService } from '../services/fileSystemService';
import { getFileIcon } from '../utils/editorUtils';

// ================================
// TYPES
// ================================

interface QuickOpenProps {
  isOpen: boolean;
  projectPath: string;
  onClose: () => void;
  onFileSelect: (file: FileNode) => void;
  recentFiles?: string[]; // Recently opened files for prioritization
}

interface SearchResult {
  file: FileNode;
  score: number;
  matchIndices: number[]; // Character indices that match the search
}

// ================================
// SESSION-BASED FILE PRIORITIZATION (SIMPLIFIED)
// ================================

class SessionFilePriority {
  private openedFiles = new Map<string, number>(); // path -> open count
  
  markFileOpened(filePath: string) {
    const count = this.openedFiles.get(filePath) || 0;
    this.openedFiles.set(filePath, count + 1);
  }
  
  getFileScore(filePath: string): number {
    return this.openedFiles.get(filePath) || 0;
  }
  
  getRecentFiles(): string[] {
    return Array.from(this.openedFiles.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([path]) => path)
      .slice(0, 20); // Top 20 recent files
  }
}

// Global session instance
const sessionPriority = new SessionFilePriority();

// Expose on window for other components
if (typeof window !== 'undefined') {
  (window as any).quickOpenSessionPriority = sessionPriority;
}

// ================================
// SIMPLE FUZZY SEARCH UTILITY
// ================================

const fuzzyMatch = (searchTerm: string, fileName: string): { score: number; indices: number[] } => {
  const search = searchTerm.toLowerCase();
  const name = fileName.toLowerCase();
  
  if (!search) return { score: 1, indices: [] };
  
  // Exact match gets highest score
  if (name === search) return { score: 1000, indices: Array.from({length: search.length}, (_, i) => i) };
  
  // Start of filename match gets high score
  if (name.startsWith(search)) {
    return { score: 500, indices: Array.from({length: search.length}, (_, i) => i) };
  }
  
  // Simple fuzzy match
  let score = 0;
  let searchIndex = 0;
  const indices: number[] = [];
  
  for (let i = 0; i < name.length && searchIndex < search.length; i++) {
    if (name[i] === search[searchIndex]) {
      indices.push(i);
      score += 10;
      searchIndex++;
    }
  }
  
  return searchIndex === search.length ? { score, indices } : { score: 0, indices: [] };
};

// ================================
// QUICK OPEN COMPONENT (SIMPLIFIED)
// ================================

export const QuickOpen: React.FC<QuickOpenProps> = ({
  isOpen,
  projectPath,
  onClose,
  onFileSelect,
  recentFiles = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number>();

  // Perform search when user types (debounced)
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !projectPath) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Get recent files first (instant)
      const recentFilesList = [...recentFiles, ...sessionPriority.getRecentFiles()];
      const recentResults: SearchResult[] = [];

      // Search in recent files first
      for (const filePath of recentFilesList) {
        const fileName = filePath.split('/').pop() || '';
        const match = fuzzyMatch(query, fileName);
        if (match.score > 0) {
          recentResults.push({
            file: {
              id: filePath,
              path: filePath,
              name: fileName,
              isDirectory: false,
              extension: fileName.split('.').pop() || '',
              iconId: 'file',
              hasChildren: false,
              isExpanded: false,
              depth: 0,
              size: 0,
              lastModified: Date.now()
            },
            score: match.score + 1000, // Boost recent files
            matchIndices: match.indices
          });
        }
      }

      // Start with recent files for instant feedback
      setSearchResults(recentResults.slice(0, 20));

      // Search in project files recursively (but efficiently)
      const allResults: SearchResult[] = [...recentResults];
      
      // Recursive search with depth limit
      const searchInDirectory = async (dirPath: string, depth: number = 0): Promise<void> => {
        if (depth > 3) return; // Limit depth to prevent infinite recursion
        
        try {
          const items = await fileSystemService.loadFolderContents(dirPath, false);
          
          for (const item of items) {
            // Skip common directories that don't contain user files
            if (item.isDirectory) {
              const dirName = item.name.toLowerCase();
              if (!['node_modules', '.git', '.vscode', 'dist', 'build', 'target'].includes(dirName)) {
                await searchInDirectory(item.path, depth + 1);
              }
            } else {
              // Search files
              const match = fuzzyMatch(query, item.name);
              if (match.score > 0) {
                const result = {
                  file: item,
                  score: match.score + sessionPriority.getFileScore(item.path),
                  matchIndices: match.indices
                };
                allResults.push(result);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not search directory ${dirPath}:`, error);
        }
      };

      // Start recursive search from project root
      await searchInDirectory(projectPath);

      // Remove duplicates and sort results
      const uniqueResults = allResults.filter((result, index, array) => 
        array.findIndex(r => r.file.path === result.file.path) === index
      );

      const sortedResults = uniqueResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // Limit results

      setSearchResults(sortedResults);

    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [projectPath, recentFiles]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm) {
      searchTimeoutRef.current = window.setTimeout(() => {
        performSearch(searchTerm);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedIndex(0);
      setError(null);
      setIsSearching(false);
      
      // Focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Update selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Handle file selection
  const handleFileClick = useCallback((file: FileNode) => {
    sessionPriority.markFileOpened(file.path);
    onFileSelect(file);
    onClose();
  }, [onFileSelect, onClose]);

  // Global keyboard handler for the dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      console.log('🎮 Global QuickOpen key:', e.key, 'Target:', e.target?.constructor.name);
      
      // Only handle arrow keys if QuickOpen is open
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        
        if (searchResults.length > 0) {
          if (e.key === 'ArrowDown') {
            setSelectedIndex(prev => {
              const newIndex = Math.min(prev + 1, searchResults.length - 1);
              console.log('🎮 Global Arrow Down: moving from', prev, 'to', newIndex);
              return newIndex;
            });
          } else if (e.key === 'ArrowUp') {
            setSelectedIndex(prev => {
              const newIndex = Math.max(prev - 1, 0);
              console.log('🎮 Global Arrow Up: moving from', prev, 'to', newIndex);
              return newIndex;
            });
          }
        }
        return;
      }
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
          
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (searchResults[selectedIndex]) {
            const selectedFile = searchResults[selectedIndex].file;
            console.log('🎮 Global Enter: selecting file', selectedFile.name);
            sessionPriority.markFileOpened(selectedFile.path);
            onFileSelect(selectedFile);
            onClose();
          }
          break;
      }
    };

    // Add event listener with high priority (capture=true)
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isOpen, onClose, onFileSelect, searchResults, selectedIndex]);

  // Keyboard navigation (keeping this for the input field)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    console.log('🎮 Input QuickOpen key pressed:', e.key, 'Results:', searchResults.length, 'Selected:', selectedIndex);
    
    // Handle arrow keys specially to prevent scrolling
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      
      if (searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          setSelectedIndex(prev => {
            const newIndex = Math.min(prev + 1, searchResults.length - 1);
            console.log('🎮 Input Arrow Down: moving from', prev, 'to', newIndex);
            return newIndex;
          });
        } else if (e.key === 'ArrowUp') {
          setSelectedIndex(prev => {
            const newIndex = Math.max(prev - 1, 0);
            console.log('🎮 Input Arrow Up: moving from', prev, 'to', newIndex);
            return newIndex;
          });
        }
      }
      return;
    }
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
        
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (searchResults[selectedIndex]) {
          const selectedFile = searchResults[selectedIndex].file;
          console.log('🎮 Input Enter: selecting file', selectedFile.name);
          sessionPriority.markFileOpened(selectedFile.path);
          onFileSelect(selectedFile);
          onClose();
        }
        break;
    }
  }, [onClose, onFileSelect, searchResults, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0 && searchResults.length > 0) {
      const resultItems = listRef.current.querySelector('.p-1')?.children;
      if (resultItems && resultItems[selectedIndex]) {
        const selectedElement = resultItems[selectedIndex] as HTMLElement;
        selectedElement.scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        });
        console.log('🎮 Scrolled to item', selectedIndex);
      }
    }
  }, [selectedIndex, searchResults]);

  // Render highlighted text
  const renderHighlightedText = (text: string, indices: number[]) => {
    if (!indices.length) return text;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    indices.forEach((index, i) => {
      if (index > lastIndex) {
        parts.push(text.slice(lastIndex, index));
      }
      
      parts.push(
        <span key={i} className="bg-vscode-accent text-vscode-bg font-semibold">
          {text[index]}
        </span>
      );
      
      lastIndex = index + 1;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div 
        className="bg-vscode-bg border border-vscode-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col"
        tabIndex={-1}
        onKeyDown={(e) => {
          // Prevent arrow keys from bubbling up
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-vscode-border">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search files..."
            className="w-full bg-vscode-input border border-vscode-border rounded px-3 py-2 text-vscode-fg placeholder-vscode-fg-muted focus:outline-none focus:border-vscode-accent"
          />
          
          <div className="flex items-center justify-between mt-2 text-xs text-vscode-fg-muted">
            <span>
              {isSearching ? 'Searching...' : `${searchResults.length} results`}
            </span>
            <span>
              ↑↓ Navigate • Enter Select • Esc Close
            </span>
          </div>
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ 
            maxHeight: 'calc(70vh - 120px)',
            scrollBehavior: 'smooth',
            // Prevent arrow key scrolling, only allow programmatic scrolling
            overflowX: 'hidden'
          }}
          onKeyDown={(e) => {
            // Completely block arrow keys from scrolling this container
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {error ? (
            <div className="p-4 text-center">
              <div className="text-red-400 mb-2">⚠️ Error</div>
              <div className="text-vscode-fg-muted">{error}</div>
            </div>
          ) : !searchTerm ? (
            <div className="p-4 text-center">
              <div className="text-vscode-fg-muted mb-2">🔍 Start typing to search files</div>
              <div className="text-xs text-vscode-fg-muted">
                Search will include recently opened files and all subdirectories
              </div>
            </div>
          ) : searchResults.length === 0 && !isSearching ? (
            <div className="p-4 text-center">
              <div className="text-vscode-fg-muted mb-2">🔍 No matching files</div>
              <div className="text-xs text-vscode-fg-muted">
                Try a different search term
              </div>
            </div>
          ) : (
            <div className="p-1">
              {searchResults.map((result, index) => {
                const isSelected = index === selectedIndex;
                const isRecent = recentFiles.includes(result.file.path) || 
                                sessionPriority.getFileScore(result.file.path) > 0;
                
                return (
                  <div
                    key={result.file.path}
                    onClick={() => handleFileClick(result.file)}
                    className={`
                      flex items-center px-3 py-2 rounded cursor-pointer transition-colors
                      ${isSelected 
                        ? 'bg-vscode-list-active text-vscode-list-active-fg' 
                        : 'hover:bg-vscode-list-hover'
                      }
                    `}
                  >
                    {/* File Icon */}
                    <span className="mr-3 text-lg flex-shrink-0">
                      {getFileIcon(result.file.extension)}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      {/* File Name with Highlighting */}
                      <div className="font-medium truncate">
                        {renderHighlightedText(result.file.name, result.matchIndices)}
                        {isRecent && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                            Recent
                          </span>
                        )}
                      </div>
                      
                      {/* File Path */}
                      <div className="text-xs text-vscode-fg-muted truncate">
                        {result.file.path.replace(projectPath, '')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 