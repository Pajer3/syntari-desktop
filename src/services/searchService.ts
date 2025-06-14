// Syntari AI IDE - Search Service
// Bridges SearchReplacePanel UI with Tauri backend filesystem commands

import { invoke } from '@tauri-apps/api/core';
import type { 
  SearchOptions, 
  SearchResult, 
  ReplaceOptions,
  ServiceError 
} from './types';

class SearchService {
  private searchHistory: string[] = [];
  private readonly maxHistorySize = 50;

  /**
   * Initialize the search service
   */
  async initialize(): Promise<void> {
    try {
      // Test connection to Tauri backend using correct parameter name
      const result = await invoke<any>('check_folder_permissions', { path: '.' });
      if (!result.success) {
        throw new Error(result.error || 'Permission check failed');
      }
    } catch (error) {
      console.warn('Search service initialization failed, using fallback mode:', error);
    }
  }

  /**
   * Search for text in the project
   */
  async searchInProject(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Add to search history
      if (options.query && !this.searchHistory.includes(options.query)) {
        this.searchHistory.unshift(options.query);
        if (this.searchHistory.length > this.maxHistorySize) {
          this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
      }

      // Call Tauri backend search
      const results = await invoke<any[]>('search_in_project', {
        query: options.query,
        caseSensitive: options.caseSensitive,
        wholeWord: options.wholeWord,
        useRegex: options.useRegex,
        includePatterns: options.includePatterns || [],
        excludePatterns: options.excludePatterns || [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          'target/**',
          '*.log',
          '*.tmp'
        ],
        maxResults: options.maxResults || 1000,
      });

      // Transform results to our SearchResult format
      return results.map(result => ({
        file: result.file,
        line: result.line,
        column: result.column,
        text: result.text,
        match: result.match,
        preview: this.generatePreview(result.text, result.match, result.column),
      }));
    } catch (error) {
      throw this.handleError('SEARCH_FAILED', 'Failed to search in project', error);
    }
  }

  /**
   * Search with streaming results for large projects
   */
  async searchInProjectStreaming(
    options: SearchOptions,
    onResult: (result: SearchResult) => void,
    onComplete: () => void,
    onError: (error: ServiceError) => void
  ): Promise<void> {
    try {
      // Use streaming search for better performance on large projects
      await invoke('search_in_project_streaming', {
        query: options.query,
        caseSensitive: options.caseSensitive,
        wholeWord: options.wholeWord,
        useRegex: options.useRegex,
        includePatterns: options.includePatterns || [],
        excludePatterns: options.excludePatterns || [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          'target/**',
          '*.log',
          '*.tmp'
        ],
        maxResults: options.maxResults || 1000,
        onResult: (result: any) => {
          const searchResult: SearchResult = {
            file: result.file,
            line: result.line,
            column: result.column,
            text: result.text,
            match: result.match,
            preview: this.generatePreview(result.text, result.match, result.column),
          };
          onResult(searchResult);
        },
        onComplete,
        onError: (error: any) => onError(this.handleError('STREAMING_SEARCH_FAILED', 'Streaming search failed', error)),
      });
    } catch (error) {
      onError(this.handleError('SEARCH_STREAMING_FAILED', 'Failed to start streaming search', error));
    }
  }

  /**
   * Replace text in a specific file
   */
  async replaceInFile(
    filePath: string, 
    options: ReplaceOptions
  ): Promise<{ replacements: number; content: string }> {
    try {
      // Read file content
      const content = await invoke<string>('read_file', { path: filePath });
      
      let newContent = content;
      let replacements = 0;

      if (options.useRegex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(options.query, flags);
        const matches = content.match(regex);
        replacements = matches?.length || 0;
        newContent = content.replace(regex, options.replacement);
      } else {
        const searchStr = options.caseSensitive ? options.query : options.query.toLowerCase();
        
        if (options.wholeWord) {
          const regex = new RegExp(`\\b${this.escapeRegex(searchStr)}\\b`, options.caseSensitive ? 'g' : 'gi');
          const matches = content.match(regex);
          replacements = matches?.length || 0;
          newContent = content.replace(regex, options.replacement);
        } else {
          // Simple string replacement
          const parts = content.split(options.query);
          replacements = parts.length - 1;
          newContent = parts.join(options.replacement);
        }
      }

      // Save the modified content
      if (replacements > 0) {
        await invoke('save_file', { path: filePath, content: newContent });
      }

      return { replacements, content: newContent };
    } catch (error) {
      throw this.handleError('REPLACE_FAILED', `Failed to replace in file ${filePath}`, error);
    }
  }

  /**
   * Replace all occurrences in project
   */
  async replaceAll(
    options: ReplaceOptions,
    onProgress?: (file: string, replacements: number) => void
  ): Promise<{ replacedCount: number; filesModified: number }> {
    const result = await this.replaceAllInProject(options, onProgress);
    return { replacedCount: result.totalReplacements, filesModified: result.filesModified };
  }

  /**
   * Replace all occurrences in project (internal method)
   */
  async replaceAllInProject(
    options: ReplaceOptions,
    onProgress?: (file: string, replacements: number) => void
  ): Promise<{ totalReplacements: number; filesModified: number }> {
    try {
      // First, search for all occurrences
      const searchResults = await this.searchInProject(options);
      
      // Group results by file
      const fileGroups = new Map<string, SearchResult[]>();
      for (const result of searchResults) {
        if (!fileGroups.has(result.file)) {
          fileGroups.set(result.file, []);
        }
        fileGroups.get(result.file)!.push(result);
      }

      let totalReplacements = 0;
      let filesModified = 0;

      // Replace in each file
      for (const [filePath] of fileGroups) {
        try {
          const { replacements } = await this.replaceInFile(filePath, options);
          if (replacements > 0) {
            totalReplacements += replacements;
            filesModified++;
            onProgress?.(filePath, replacements);
          }
        } catch (error) {
          console.error(`Failed to replace in ${filePath}:`, error);
          // Continue with other files
        }
      }

      return { totalReplacements, filesModified };
    } catch (error) {
      throw this.handleError('REPLACE_ALL_FAILED', 'Failed to replace all in project', error);
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Generate AI search suggestions based on context
   */
  async generateSearchSuggestions(query: string): Promise<string[]> {
    try {
      // This could be enhanced with AI integration
      const suggestions: string[] = [];
      
      // Add common programming patterns
      if (query.includes('function')) {
        suggestions.push('function\\s+\\w+\\s*\\(', 'async function', 'export function');
      }
      
      if (query.includes('class')) {
        suggestions.push('class\\s+\\w+', 'export class', 'abstract class');
      }
      
      if (query.includes('import')) {
        suggestions.push('import.*from', 'import\\s*{.*}', 'import\\s+\\w+');
      }

      // Add regex patterns
      if (query.length > 2) {
        suggestions.push(
          this.escapeRegex(query),
          `\\b${this.escapeRegex(query)}\\b`,
          `${this.escapeRegex(query)}.*`
        );
      }

      // Add from history
      const historyMatches = this.searchHistory.filter(h => 
        h.toLowerCase().includes(query.toLowerCase()) && h !== query
      ).slice(0, 3);
      
      suggestions.push(...historyMatches);

      return [...new Set(suggestions)]; // Remove duplicates
    } catch (error) {
      console.error('Failed to generate search suggestions:', error);
      return [];
    }
  }

  /**
   * Validate regex pattern
   */
  validateRegex(pattern: string): { isValid: boolean; error?: string } {
    try {
      new RegExp(pattern);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid regex pattern'
      };
    }
  }

  /**
   * Estimate search result count (for large projects)
   */
  async estimateResultCount(options: SearchOptions): Promise<number> {
    try {
      // Use a limited search to estimate
      const limitedOptions = { ...options, maxResults: 100 };
      const results = await this.searchInProject(limitedOptions);
      
      // If we hit the limit, this is a rough estimate
      return results.length === 100 ? 100 : results.length;
    } catch (error) {
      console.error('Failed to estimate result count:', error);
      return 0;
    }
  }

  /**
   * Validate search parameters before executing search
   */
  async validateSearchParams(query: string, options: SearchOptions): Promise<void> {
    if (!query || query.trim().length === 0) {
      throw this.handleError('INVALID_QUERY', 'Search query cannot be empty');
    }

    if (query.length > 1000) {
      throw this.handleError('QUERY_TOO_LONG', 'Search query is too long (max 1000 characters)');
    }

    // Check folder permissions using proper backend parameter name
    try {
      const result = await invoke<any>('check_folder_permissions', { path: '.' });
      if (!result.success) {
        throw new Error(result.error || 'Permission check failed');
      }
    } catch (error) {
      throw this.handleError('PERMISSION_DENIED', 'Cannot access search directory', error);
    }
  }

  // Private helper methods
  private generatePreview(text: string, match: string, column: number): string {
    const maxPreviewLength = 120;
    const beforeContext = 20;
    const afterContext = 60;
    
    const start = Math.max(0, column - beforeContext);
    const end = Math.min(text.length, column + match.length + afterContext);
    
    let preview = text.substring(start, end);
    
    if (start > 0) {
      preview = '...' + preview;
    }
    if (end < text.length) {
      preview = preview + '...';
    }
    
    return preview.length > maxPreviewLength ? 
      preview.substring(0, maxPreviewLength) + '...' : 
      preview;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[SearchService] ${code}: ${message}`, originalError);
    return {
      code,
      message,
      details: originalError,
    };
  }
}

// Export singleton instance
export const searchService = new SearchService(); 