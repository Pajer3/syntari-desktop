// Syntari AI IDE - File Save Hook
// Extracted from CodeEditor.tsx for better maintainability

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TauriResult } from '../../types/core';

interface SaveConfig {
  autoSaveEnabled: boolean;
  autoSaveDelay: number;
  performanceMonitoring: boolean;
}

interface SaveResult {
  success: boolean;
  filePath: string;
  timestamp: number;
  performanceMs?: number;
  error?: string;
}

export function useFileSave() {
  // State management
  const [saveConfig] = useState<SaveConfig>({
    autoSaveEnabled: true,
    autoSaveDelay: 2000,
    performanceMonitoring: true,
  });

  const [currentlySaving, setCurrentlySaving] = useState<Set<string>>(new Set());
  const [saveHistory, setSaveHistory] = useState<SaveResult[]>([]);

  // Core save functionality
  const saveFile = useCallback(async (
    filePath: string, 
    content: string,
    options: { 
      silent?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<SaveResult> => {
    const startTime = Date.now();
    
    // Set saving state
    setCurrentlySaving(prev => new Set([...prev, filePath]));
    
    try {
      // Validate file path if not skipped
      if (!options.skipValidation && (!filePath || filePath.trim() === '')) {
        throw new Error('Invalid file path provided');
      }
      
      // Attempt to save the file
      const saveResult = await invoke<TauriResult<string>>('save_file', { 
        path: filePath, 
        content 
      });
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Save operation failed');
      }
      
      const performanceMs = Date.now() - startTime;
      
      const result: SaveResult = {
        success: true,
        filePath,
        timestamp: Date.now(),
        performanceMs: saveConfig.performanceMonitoring ? performanceMs : undefined,
      };
      
      // Update save history
      setSaveHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
      
      if (!options.silent) {
        console.log(`💾 File saved: ${filePath} (${performanceMs}ms)`);
      }
      
      return result;
      
    } catch (error) {
      const result: SaveResult = {
        success: false,
        filePath,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      setSaveHistory(prev => [result, ...prev.slice(0, 9)]);
      
      console.error('❌ Save failed:', error);
      throw error;
      
    } finally {
      // Clear saving state
      setCurrentlySaving(prev => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });
    }
  }, [saveConfig]);

  // Save multiple files
  const saveMultiple = useCallback(async (
    files: Array<{ path: string; content: string }>
  ): Promise<SaveResult[]> => {
    const results = await Promise.allSettled(
      files.map(file => saveFile(file.path, file.content, { silent: true }))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          filePath: files[index].path,
          timestamp: Date.now(),
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }, [saveFile]);

  // Check if file is currently being saved
  const isSaving = useCallback((filePath: string): boolean => {
    return currentlySaving.has(filePath);
  }, [currentlySaving]);

  // Get save statistics
  const getSaveStats = useCallback(() => {
    const successful = saveHistory.filter(s => s.success).length;
    const failed = saveHistory.filter(s => !s.success).length;
    const avgPerformance = saveHistory
      .filter(s => s.success && s.performanceMs)
      .reduce((sum, s) => sum + (s.performanceMs || 0), 0) / successful || 0;

    return {
      totalSaves: saveHistory.length,
      successful,
      failed,
      successRate: saveHistory.length > 0 ? (successful / saveHistory.length) * 100 : 0,
      avgPerformanceMs: Math.round(avgPerformance),
    };
  }, [saveHistory]);

  return {
    saveFile,
    saveMultiple,
    isSaving,
    getSaveStats,
    saveHistory: saveHistory.slice(0, 5), // Return only last 5 for UI
  };
} 