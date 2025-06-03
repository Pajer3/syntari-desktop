// Syntari AI IDE - File Loader Hook  
// Extracted from CodeEditor.tsx for better maintainability

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FileInfo } from '../../types';
import type { EditorFile } from './useFileCache';

interface FileLoaderHookResult {
  loadFileContent: (file: FileInfo, getCached: (path: string) => string | undefined, setCached: (path: string, content: string) => void) => Promise<EditorFile | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useFileLoader = (): FileLoaderHookResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadFileContent = useCallback(async (
    file: FileInfo,
    getCached: (path: string) => string | undefined,
    setCached: (path: string, content: string) => void
  ): Promise<EditorFile | null> => {
    if (file.language === 'directory') {
      setError('Cannot open directory as file');
      return null;
    }
    
    // Check cache first
    const cached = getCached(file.path);
    if (cached) {
      const cachedFile: EditorFile = {
        ...file,
        content: cached,
        isOpen: true,
        isDirty: false,
      };
      return cachedFile;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use VS Code-style smart file reading
      const result = await invoke<{
        success: boolean;
        data?: {
          content?: string;
          size: number;
          is_binary: boolean;
          is_too_large: boolean;
          should_use_hex_mode: boolean;
          warning?: string;
        };
        error?: string;
      }>('read_file_smart', { path: file.path });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read file');
      }
      
      const fileData = result.data;
      
      // Handle VS Code-style size limits
      if (fileData.is_too_large) {
        setError(`File too large (${Math.round(fileData.size / 1024 / 1024)}MB). Maximum supported size is 256MB.`);
        return null;
      }
      
      if (fileData.should_use_hex_mode) {
        setError(`Large file (${Math.round(fileData.size / 1024 / 1024)}MB). Opening in read-only mode for performance.`);
        // TODO: Implement hex/read-only viewer
        return null;
      }
      
      if (fileData.is_binary) {
        setError('Cannot edit binary files. Consider using a hex editor.');
        return null;
      }
      
      if (fileData.warning) {
        console.warn('⚠️ File size warning:', fileData.warning);
        // Show warning but continue
      }
      
      const content = fileData.content || '';
      
      // Cache the content
      setCached(file.path, content);
      
      const loadedFile: EditorFile = {
        ...file,
        content,
        isOpen: true,
        isDirty: false,
      };
      
      // Show performance warning for large files
      if (fileData.size > 1024 * 1024) { // 1MB
        console.log(`📊 Large file loaded: ${Math.round(fileData.size / 1024)}KB`);
      }
      
      return loadedFile;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load file: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    loadFileContent,
    isLoading,
    error,
    clearError,
  };
}; 