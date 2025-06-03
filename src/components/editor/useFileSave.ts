// Syntari AI IDE - File Save Hook
// Extracted from CodeEditor.tsx for better maintainability

import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { EditorFile } from './useFileCache';

interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FileSaveHookResult {
  saveFile: (file: EditorFile, content: string, updateCache: (path: string, content: string) => void) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  scheduleAutoSave: (file: EditorFile, content: string, updateCache: (path: string, content: string) => void, delayMs?: number) => void;
  cancelAutoSave: () => void;
}

export const useFileSave = (): FileSaveHookResult => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<number>();

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = undefined;
    }
  }, []);

  const saveFile = useCallback(async (
    file: EditorFile,
    content: string,
    updateCache: (path: string, content: string) => void
  ): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const result = await invoke<TauriResult<string>>('save_file', { 
        path: file.path, 
        content: content 
      });
      
      if (result.success) {
        // Update cache
        updateCache(file.path, content);
        
        // Clear auto-save timeout
        cancelAutoSave();
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setSaveError(`Failed to save file: ${errorMessage}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [cancelAutoSave]);

  const scheduleAutoSave = useCallback((
    file: EditorFile,
    content: string,
    updateCache: (path: string, content: string) => void,
    delayMs: number = 5000
  ) => {
    // Clear existing auto-save timeout
    cancelAutoSave();
    
    // Set auto-save timeout
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      saveFile(file, content, updateCache);
    }, delayMs);
  }, [cancelAutoSave, saveFile]);

  return {
    saveFile,
    isSaving,
    saveError,
    clearSaveError,
    scheduleAutoSave,
    cancelAutoSave,
  };
}; 