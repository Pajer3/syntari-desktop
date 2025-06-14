// Syntari AI IDE - Workspace Symbol Search Hook
// Simple workspace-wide symbol search for navigation

import { useState, useCallback, useMemo, useEffect } from 'react';

export interface WorkspaceSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'method' | 'property' | 'enum' | 'module';
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  containerName?: string;
  description?: string;
}

export interface WorkspaceSymbolManager {
  symbols: WorkspaceSymbol[];
  searchSymbols: (query: string) => WorkspaceSymbol[];
  isLoading: boolean;
  refreshSymbols: () => Promise<void>;
  addSymbolsFromFile: (filePath: string, symbols: WorkspaceSymbol[]) => void;
  removeSymbolsFromFile: (filePath: string) => void;
}

export const useWorkspaceSymbols = (): WorkspaceSymbolManager => {
  const [symbols, setSymbols] = useState<WorkspaceSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simple symbol search with fuzzy matching
  const searchSymbols = useCallback((query: string): WorkspaceSymbol[] => {
    if (!query.trim()) {
      return symbols.slice(0, 50); // Return first 50 symbols if no query
    }

    const lowerQuery = query.toLowerCase();
    
    return symbols
      .filter(symbol => {
        const nameMatch = symbol.name.toLowerCase().includes(lowerQuery);
        const containerMatch = symbol.containerName?.toLowerCase().includes(lowerQuery);
        const fileMatch = symbol.filePath.toLowerCase().includes(lowerQuery);
        
        return nameMatch || containerMatch || fileMatch;
      })
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.name.toLowerCase() === lowerQuery;
        const bExact = b.name.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize starts with
        const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Finally sort by name
        return a.name.localeCompare(b.name);
      })
      .slice(0, 100); // Limit results for performance
  }, [symbols]);

  // Add symbols from a specific file
  const addSymbolsFromFile = useCallback((filePath: string, newSymbols: WorkspaceSymbol[]) => {
    setSymbols(prev => {
      // Remove existing symbols from this file
      const filtered = prev.filter(symbol => symbol.filePath !== filePath);
      // Add new symbols
      return [...filtered, ...newSymbols].sort((a, b) => {
        if (a.filePath !== b.filePath) {
          return a.filePath.localeCompare(b.filePath);
        }
        return a.lineNumber - b.lineNumber;
      });
    });
  }, []);

  // Remove symbols from a specific file
  const removeSymbolsFromFile = useCallback((filePath: string) => {
    setSymbols(prev => prev.filter(symbol => symbol.filePath !== filePath));
  }, []);

  // Refresh all symbols (placeholder for future implementation)
  const refreshSymbols = useCallback(async () => {
    setIsLoading(true);
    try {
      // Feature: Implement comprehensive workspace symbol scanning
      // Implementation notes: 
      // 1. Scan all files in the workspace using file system API
      // 2. Parse symbols using language servers or AST parsers
      // 3. Cache results for performance with incremental updates
      // 4. Support multiple languages (TypeScript, JavaScript, Python, etc.)
      
      console.log('🔍 Refreshing workspace symbols...');
      
      // Simulate some delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Failed to refresh workspace symbols:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock some sample symbols for demonstration
  const mockSymbols = useMemo((): WorkspaceSymbol[] => [
    {
      name: 'useKeyboardShortcuts',
      kind: 'function',
      filePath: 'src/hooks/useKeyboardShortcuts.ts',
      lineNumber: 15,
      columnNumber: 1,
      containerName: 'hooks',
      description: 'Custom hook for keyboard shortcuts'
    },
    {
      name: 'CodeEditor',
      kind: 'class',
      filePath: 'src/components/CodeEditor.tsx',
      lineNumber: 25,
      columnNumber: 1,
      containerName: 'components',
      description: 'Main code editor component'
    },
    {
      name: 'FileTab',
      kind: 'interface',
      filePath: 'src/types/index.ts',
      lineNumber: 45,
      columnNumber: 1,
      containerName: 'types',
      description: 'File tab interface'
    },
    {
      name: 'handleFileSelect',
      kind: 'method',
      filePath: 'src/components/CodeEditor.tsx',
      lineNumber: 150,
      columnNumber: 1,
      containerName: 'CodeEditor',
      description: 'File selection handler'
    }
  ], []);

  // Initialize with mock symbols if none are present
  useEffect(() => {
    if (symbols.length === 0) {
      setSymbols(mockSymbols);
    }
  }, []);

  return {
    symbols,
    searchSymbols,
    isLoading,
    refreshSymbols,
    addSymbolsFromFile,
    removeSymbolsFromFile
  };
}; 