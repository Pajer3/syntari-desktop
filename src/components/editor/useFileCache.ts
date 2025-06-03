// Syntari AI IDE - File Cache Hook
// Extracted from CodeEditor.tsx for better maintainability

import { useState, useCallback } from 'react';
import type { FileInfo } from '../../types';

export interface EditorFile extends FileInfo {
  isOpen: boolean;
  isDirty: boolean;
  content: string;
}

export const useFileCache = () => {
  const [fileCache] = useState(new Map<string, string>());

  const getCachedContent = useCallback((path: string): string | undefined => {
    return fileCache.get(path);
  }, [fileCache]);

  const setCachedContent = useCallback((path: string, content: string) => {
    fileCache.set(path, content);
  }, [fileCache]);

  const removeCachedContent = useCallback((path: string) => {
    fileCache.delete(path);
  }, [fileCache]);

  const clearCache = useCallback(() => {
    fileCache.clear();
  }, [fileCache]);

  const getCacheSize = useCallback(() => {
    return fileCache.size;
  }, [fileCache]);

  return {
    getCachedContent,
    setCachedContent,
    removeCachedContent,
    clearCache,
    getCacheSize,
  };
}; 