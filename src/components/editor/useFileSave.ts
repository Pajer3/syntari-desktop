// Syntari AI IDE - Enterprise File Save Management
// Advanced file save system with performance monitoring, error recovery, and business logic

import { useState, useRef, useCallback, useEffect } from 'react';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';
import { announceShortcut } from '../../utils/keyboardUtils';
import { invoke } from '@tauri-apps/api/core';
import type { EditorFile } from './useFileCache';

// ================================
// ENHANCED TYPES
// ================================

interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SaveOperation {
  id: string;
  filePath: string;
  timestamp: number;
  size: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

interface SaveMetrics {
  totalSaves: number;
  successfulSaves: number;
  failedSaves: number;
  averageSize: number;
  averageDuration: number;
  successRate: number;
  lastSaveTime?: number;
}

interface AutoSaveConfig {
  enabled: boolean;
  delayMs: number;
  maxRetries: number;
  backupOnFailure: boolean;
}

interface FileSaveHookResult {
  saveFile: (file: EditorFile, content: string, updateCache: (path: string, content: string) => void) => Promise<boolean>;
  saveFileAs: (originalFile: EditorFile, newPath: string, content: string, updateCache: (path: string, content: string) => void) => Promise<boolean>;
  saveAllFiles: (files: EditorFile[], getContent: (path: string) => string, updateCache: (path: string, content: string) => void) => Promise<{ saved: string[]; failed: string[] }>;
  isSaving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  scheduleAutoSave: (file: EditorFile, content: string, updateCache: (path: string, content: string) => void, delayMs?: number) => void;
  cancelAutoSave: () => void;
  getSaveMetrics: () => SaveMetrics;
  getRecentSaves: (limit?: number) => SaveOperation[];
  configureAutoSave: (config: Partial<AutoSaveConfig>) => void;
  createBackup: (file: EditorFile, content: string) => Promise<string | null>;
  hasUnsavedChanges: (filePath: string) => boolean;
  markFileAsSaved: (filePath: string) => void;
  markFileAsModified: (filePath: string) => void;
}

// ================================
// ENHANCED FILE SAVE HOOK
// ================================

export const useFileSave = (): FileSaveHookResult => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOperations, setSaveOperations] = useState<SaveOperation[]>([]);
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [autoSaveConfig, setAutoSaveConfig] = useState<AutoSaveConfig>({
    enabled: true,
    delayMs: 5000,
    maxRetries: 3,
    backupOnFailure: true
  });

  const autoSaveTimeoutRef = useRef<number>();
  const saveOperationIdRef = useRef(0);

  // Enhanced keyboard shortcuts integration
  useShortcut('fileManagement', 'saveFile', useCallback((e: any) => {
    e.preventDefault?.();
    // This would be handled by the parent component that has access to current file
    announceShortcut('Save File', 'Save shortcut triggered');
  }, []));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAutoSave();
    };
  }, []);

  // Performance monitoring and metrics
  const recordSaveOperation = useCallback((operation: SaveOperation) => {
    setSaveOperations(prev => {
      const newOperations = [...prev, operation];
      // Keep only last 100 operations for performance
      return newOperations.slice(-100);
    });
  }, []);

  const getSaveMetrics = useCallback((): SaveMetrics => {
    const totalSaves = saveOperations.length;
    const successfulSaves = saveOperations.filter(op => op.success).length;
    const failedSaves = totalSaves - successfulSaves;
    
    const avgSize = totalSaves > 0 
      ? saveOperations.reduce((sum, op) => sum + op.size, 0) / totalSaves 
      : 0;
    
    const avgDuration = saveOperations.filter(op => op.duration).length > 0
      ? saveOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / saveOperations.filter(op => op.duration).length
      : 0;

    const successRate = totalSaves > 0 ? (successfulSaves / totalSaves) * 100 : 100;
    
    const lastSaveTime = saveOperations.length > 0 
      ? saveOperations[saveOperations.length - 1].timestamp 
      : undefined;

    return {
      totalSaves,
      successfulSaves,
      failedSaves,
      averageSize: avgSize,
      averageDuration: avgDuration,
      successRate,
      lastSaveTime
    };
  }, [saveOperations]);

  const getRecentSaves = useCallback((limit: number = 10) => {
    return saveOperations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }, [saveOperations]);

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = undefined;
    }
  }, []);

  const hasUnsavedChanges = useCallback((filePath: string): boolean => {
    return unsavedFiles.has(filePath);
  }, [unsavedFiles]);

  const markFileAsSaved = useCallback((filePath: string) => {
    setUnsavedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(filePath);
      return newSet;
    });
  }, []);

  const markFileAsModified = useCallback((filePath: string) => {
    setUnsavedFiles(prev => new Set(prev.add(filePath)));
  }, []);

  const createBackup = useCallback(async (file: EditorFile, content: string): Promise<string | null> => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${file.path}.backup.${timestamp}`;
      
      const result = await invoke<TauriResult<string>>('save_file', {
        path: backupPath,
        content: content
      });

      if (result.success) {
        return backupPath;
      } else {
        console.warn('Failed to create backup:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }, []);

  const saveFileCore = useCallback(async (
    filePath: string,
    content: string,
    updateCache: (path: string, content: string) => void,
    isAutoSave: boolean = false
  ): Promise<boolean> => {
    const operationId = (++saveOperationIdRef.current).toString();
    const startTime = performance.now();
    const operation: SaveOperation = {
      id: operationId,
      filePath,
      timestamp: Date.now(),
      size: new Blob([content]).size
    };

    if (!isAutoSave) {
      setIsSaving(true);
    }
    setSaveError(null);
    
    try {
      // Create backup if configured and this is a manual save
      if (!isAutoSave && autoSaveConfig.backupOnFailure) {
        await createBackup({ path: filePath } as EditorFile, content);
      }

      const result = await invoke<TauriResult<string>>('save_file', { 
        path: filePath, 
        content: content 
      });
      
      const duration = performance.now() - startTime;
      operation.duration = duration;
      operation.success = result.success;
      
      if (result.success) {
        // Update cache and mark as saved
        updateCache(filePath, content);
        markFileAsSaved(filePath);
        
        // Clear auto-save timeout
        cancelAutoSave();
        
        // Record successful operation
        recordSaveOperation(operation);
        
        // Performance warning for slow saves
        if (duration > 1000) {
          console.warn(`Slow file save detected: ${filePath} took ${duration.toFixed(2)}ms`);
        }
        
        if (!isAutoSave) {
          announceShortcut('File Save', `Successfully saved ${filePath.split('/').pop()}`);
        }
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      operation.error = errorMessage;
      operation.success = false;
      
      setSaveError(`Failed to save file: ${errorMessage}`);
      recordSaveOperation(operation);
      
      // Mark file as modified if save failed
      markFileAsModified(filePath);
      
      console.error('Save operation failed:', {
        filePath,
        error: errorMessage,
        operationId,
        isAutoSave
      });
      
      return false;
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  }, [autoSaveConfig.backupOnFailure, markFileAsSaved, cancelAutoSave, recordSaveOperation, createBackup, markFileAsModified]);

  const saveFile = useCallback(async (
    file: EditorFile,
    content: string,
    updateCache: (path: string, content: string) => void
  ): Promise<boolean> => {
    return saveFileCore(file.path, content, updateCache, false);
  }, [saveFileCore]);

  const saveFileAs = useCallback(async (
    originalFile: EditorFile,
    newPath: string,
    content: string,
    updateCache: (path: string, content: string) => void
  ): Promise<boolean> => {
    const success = await saveFileCore(newPath, content, updateCache, false);
    
    if (success) {
      // Mark original file as saved if it was renamed
      markFileAsSaved(originalFile.path);
      announceShortcut('Save As', `Saved as ${newPath.split('/').pop()}`);
    }
    
    return success;
  }, [saveFileCore, markFileAsSaved]);

  const saveAllFiles = useCallback(async (
    files: EditorFile[],
    getContent: (path: string) => string,
    updateCache: (path: string, content: string) => void
  ): Promise<{ saved: string[]; failed: string[] }> => {
    const saved: string[] = [];
    const failed: string[] = [];
    
    setIsSaving(true);
    
    try {
      // Process saves in parallel with concurrency limit
      const concurrencyLimit = 5;
      const batches = [];
      
      for (let i = 0; i < files.length; i += concurrencyLimit) {
        batches.push(files.slice(i, i + concurrencyLimit));
      }
      
      for (const batch of batches) {
        const promises = batch.map(async (file) => {
          try {
            const content = getContent(file.path);
            const success = await saveFileCore(file.path, content, updateCache, false);
            
            if (success) {
              saved.push(file.path);
            } else {
              failed.push(file.path);
            }
          } catch (error) {
            failed.push(file.path);
            console.error(`Failed to save ${file.path}:`, error);
          }
        });
        
        await Promise.all(promises);
      }
      
      announceShortcut('Save All', `Saved ${saved.length} files, ${failed.length} failed`);
      
    } catch (error) {
      console.error('Error in save all operation:', error);
      // Add remaining files to failed list
      files.forEach(file => {
        if (!saved.includes(file.path) && !failed.includes(file.path)) {
          failed.push(file.path);
        }
      });
    } finally {
      setIsSaving(false);
    }
    
    return { saved, failed };
  }, [saveFileCore]);

  const scheduleAutoSave = useCallback((
    file: EditorFile,
    content: string,
    updateCache: (path: string, content: string) => void,
    delayMs?: number
  ) => {
    if (!autoSaveConfig.enabled) return;
    
    // Clear existing auto-save timeout
    cancelAutoSave();
    
    const delay = delayMs ?? autoSaveConfig.delayMs;
    
    // Set auto-save timeout
    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveFileCore(file.path, content, updateCache, true);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, delay);
  }, [autoSaveConfig.enabled, autoSaveConfig.delayMs, cancelAutoSave, saveFileCore]);

  const configureAutoSave = useCallback((config: Partial<AutoSaveConfig>) => {
    setAutoSaveConfig(prev => ({ ...prev, ...config }));
  }, []);

  return {
    saveFile,
    saveFileAs,
    saveAllFiles,
    isSaving,
    saveError,
    clearSaveError,
    scheduleAutoSave,
    cancelAutoSave,
    getSaveMetrics,
    getRecentSaves,
    configureAutoSave,
    createBackup,
    hasUnsavedChanges,
    markFileAsSaved,
    markFileAsModified,
  };
}; 