// Syntari AI IDE - Project-wide Find and Replace Hook
// Manages large-scale refactoring operations across the entire project

import { useState, useCallback, useRef } from 'react';

export interface ReplaceMatch {
  filePath: string;
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  matchText: string;
  lineContent: string;
  contextBefore?: string;
  contextAfter?: string;
}

export interface ReplaceOperation {
  id: string;
  searchTerm: string;
  replaceTerm: string;
  matches: ReplaceMatch[];
  isRegex: boolean;
  isCaseSensitive: boolean;
  wholeWord: boolean;
  includePatterns: string[];
  excludePatterns: string[];
}

export interface ReplaceResult {
  success: boolean;
  filesModified: number;
  totalReplacements: number;
  errors: string[];
  modifiedFiles: string[];
}

export interface ProjectReplaceManager {
  isSearching: boolean;
  isReplacing: boolean;
  currentOperation: ReplaceOperation | null;
  searchAndReplace: (options: Omit<ReplaceOperation, 'id' | 'matches'>) => Promise<ReplaceMatch[]>;
  executeReplace: (operation: ReplaceOperation, selectedMatches?: ReplaceMatch[]) => Promise<ReplaceResult>;
  cancelOperation: () => void;
  previewReplace: (operation: ReplaceOperation) => Promise<ReplaceMatch[]>;
}

export const useProjectReplace = (projectPath: string): ProjectReplaceManager => {
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<ReplaceOperation | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const generateOperationId = useCallback(() => {
    return `replace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const cancelOperation = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    setIsSearching(false);
    setIsReplacing(false);
    setCurrentOperation(null);
  }, []);

  const searchFiles = useCallback(async (
    searchTerm: string,
    options: {
      isRegex: boolean;
      isCaseSensitive: boolean;
      wholeWord: boolean;
      includePatterns: string[];
      excludePatterns: string[];
    }
  ): Promise<ReplaceMatch[]> => {
    // Import services and utilities
    const { fileSystemService } = await import('../services/fileSystemService');

    const matches: ReplaceMatch[] = [];

    try {
      // Get all files in the project
      const allFiles = await fileSystemService.getAllFiles(projectPath);
      
      // Filter files based on include/exclude patterns
      const filteredFiles = allFiles.filter(fileNode => {
        const relativePath = fileNode.path.replace(projectPath, '').replace(/^\//, '');
        
        // Check exclude patterns first
        if (options.excludePatterns.length > 0) {
          const shouldExclude = options.excludePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(relativePath);
          });
          if (shouldExclude) return false;
        }
        
        // Check include patterns
        if (options.includePatterns.length > 0) {
          return options.includePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(relativePath);
          });
        }
        
        return true;
      });

      // Search in each file
      for (const fileNode of filteredFiles) {
        if (abortController.current?.signal.aborted) {
          break;
        }

        try {
          const readResult = await fileSystemService.readFile(fileNode.path);
          const content = readResult.content || '';
          const lines = content.split('\n');

          // Create search regex
          let searchRegex: RegExp;
          if (options.isRegex) {
            const flags = options.isCaseSensitive ? 'g' : 'gi';
            searchRegex = new RegExp(searchTerm, flags);
          } else {
            let escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (options.wholeWord) {
              escapedTerm = `\\b${escapedTerm}\\b`;
            }
            const flags = options.isCaseSensitive ? 'g' : 'gi';
            searchRegex = new RegExp(escapedTerm, flags);
          }

          // Search each line
          lines.forEach((line, lineIndex) => {
            let match;
            while ((match = searchRegex.exec(line)) !== null) {
              matches.push({
                filePath: fileNode.path,
                lineNumber: lineIndex + 1,
                columnStart: match.index,
                columnEnd: match.index + match[0].length,
                matchText: match[0],
                lineContent: line,
                contextBefore: lineIndex > 0 ? lines[lineIndex - 1] : undefined,
                contextAfter: lineIndex < lines.length - 1 ? lines[lineIndex + 1] : undefined
              });

              // Prevent infinite loop for zero-width matches
              if (match[0].length === 0) {
                searchRegex.lastIndex++;
              }
            }
          });
        } catch (error) {
          console.warn(`Failed to search in file ${fileNode.path}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to search project:', error);
      throw error;
    }

    return matches;
  }, [projectPath]);

  const searchAndReplace = useCallback(async (
    options: Omit<ReplaceOperation, 'id' | 'matches'>
  ): Promise<ReplaceMatch[]> => {
    setIsSearching(true);
    abortController.current = new AbortController();

    try {
      const matches = await searchFiles(options.searchTerm, {
        isRegex: options.isRegex,
        isCaseSensitive: options.isCaseSensitive,
        wholeWord: options.wholeWord,
        includePatterns: options.includePatterns,
        excludePatterns: options.excludePatterns
      });

      const operation: ReplaceOperation = {
        id: generateOperationId(),
        ...options,
        matches
      };

      setCurrentOperation(operation);
      return matches;
    } finally {
      setIsSearching(false);
      abortController.current = null;
    }
  }, [searchFiles, generateOperationId]);

  const previewReplace = useCallback(async (operation: ReplaceOperation): Promise<ReplaceMatch[]> => {
    // For preview, we just return the matches with the replacement applied to the match text
    return operation.matches.map(match => ({
      ...match,
      matchText: operation.replaceTerm // Show what the replacement would look like
    }));
  }, []);

  const executeReplace = useCallback(async (
    operation: ReplaceOperation,
    selectedMatches?: ReplaceMatch[]
  ): Promise<ReplaceResult> => {
    setIsReplacing(true);
    abortController.current = new AbortController();

    const result: ReplaceResult = {
      success: true,
      filesModified: 0,
      totalReplacements: 0,
      errors: [],
      modifiedFiles: []
    };

    try {
      const matchesToReplace = selectedMatches || operation.matches;
      
      // Group matches by file
      const fileGroups = new Map<string, ReplaceMatch[]>();
      matchesToReplace.forEach(match => {
        if (!fileGroups.has(match.filePath)) {
          fileGroups.set(match.filePath, []);
        }
        fileGroups.get(match.filePath)!.push(match);
      });

      // Import file system service
      const { fileSystemService } = await import('../services/fileSystemService');

      // Process each file
      for (const [filePath, matches] of fileGroups) {
        if (abortController.current?.signal.aborted) {
          break;
        }

        try {
          // Read file content
          const readResult = await fileSystemService.readFile(filePath);
          const content = readResult.content || '';
          const lines = content.split('\n');

          // Sort matches by line and column (reverse order to avoid offset issues)
          const sortedMatches = matches.sort((a, b) => {
            if (a.lineNumber !== b.lineNumber) {
              return b.lineNumber - a.lineNumber;
            }
            return b.columnStart - a.columnStart;
          });

          // Apply replacements
          let replacementCount = 0;
          sortedMatches.forEach(match => {
            const lineIndex = match.lineNumber - 1;
            if (lineIndex >= 0 && lineIndex < lines.length) {
              const line = lines[lineIndex];
              const before = line.substring(0, match.columnStart);
              const after = line.substring(match.columnEnd);
              lines[lineIndex] = before + operation.replaceTerm + after;
              replacementCount++;
            }
          });

          // Write modified content back to file
          const modifiedContent = lines.join('\n');
          await fileSystemService.saveFile(filePath, modifiedContent);

          result.filesModified++;
          result.totalReplacements += replacementCount;
          result.modifiedFiles.push(filePath);

        } catch (error) {
          const errorMessage = `Failed to replace in ${filePath}: ${error}`;
          result.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Replace operation failed: ${error}`);
    } finally {
      setIsReplacing(false);
      abortController.current = null;
    }

    return result;
  }, []);

  return {
    isSearching,
    isReplacing,
    currentOperation,
    searchAndReplace,
    executeReplace,
    cancelOperation,
    previewReplace
  };
}; 