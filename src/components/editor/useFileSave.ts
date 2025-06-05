// Syntari AI IDE - Enterprise File Save Management with VS Code-style Backup System
// Advanced file save system with performance monitoring, error recovery, and clean backup storage

import { useState, useRef, useCallback, useEffect } from 'react';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';
import { announceShortcut } from '../../utils/keyboardUtils';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { EditorFile } from './useFileCache';

// ================================
// ENHANCED TYPES
// ================================

interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SaveConfig {
  autoSaveEnabled: boolean;
  autoSaveDelay: number;
  backupOnFailure: boolean;
  enableRecovery: boolean;
  maxBackupRetention: number; // Days
  compressionEnabled: boolean;
  performanceMonitoring: boolean;
}

interface SaveResult {
  success: boolean;
  filePath: string;
  timestamp: number;
  backupCreated?: boolean;
  backupPath?: string;
  performanceMs?: number;
  error?: string;
  recoveryData?: RecoveryData;
}

interface RecoveryData {
  originalPath: string;
  backupPath: string;
  timestamp: number;
  fileSize: number;
  checksum: string;
}

interface BackupInfo {
  path: string;
  originalFile: string;
  timestamp: number;
  size: number;
}

// ================================
// VS CODE-STYLE BACKUP SYSTEM
// ================================

class BackupManager {
  private backupDir: string | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get OS-appropriate app data directory (just like VS Code)
      const appDir = await appDataDir();
      this.backupDir = await join(appDir, 'Syntari', 'Backups');
      
      // Create backup directory if it doesn't exist
      await invoke<TauriResult<string>>('create_dir_all', { path: this.backupDir });
      
      this.initialized = true;
      console.log('📁 Backup system initialized:', this.backupDir);
    } catch (error) {
      console.error('❌ Failed to initialize backup system:', error);
      throw error;
    }
  }

  async createBackup(filePath: string, content: string): Promise<string> {
    if (!this.initialized) await this.initialize();
    if (!this.backupDir) throw new Error('Backup directory not initialized');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filePath.split('/').pop() || 'unknown';
    const backupFileName = `${fileName}.backup.${timestamp}`;
    
    // Create project-specific subdirectory to organize backups
    const projectHash = this.generateProjectHash(filePath);
    const projectBackupDir = await join(this.backupDir, projectHash);
    
    // Ensure project backup directory exists
    await invoke<TauriResult<string>>('create_dir_all', { path: projectBackupDir });
    
    const backupPath = await join(projectBackupDir, backupFileName);
    
    try {
      // Save backup file
      await invoke<TauriResult<string>>('save_file', { 
        path: backupPath, 
        content 
      });
      
      console.log('💾 Backup created:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    if (!this.initialized) await this.initialize();
    if (!this.backupDir) return [];

    try {
      const result = await invoke<TauriResult<string[]>>('list_backup_files', { 
        backupDir: this.backupDir 
      });
      
      if (!result.success || !result.data) return [];

      const backups: BackupInfo[] = [];
      
      for (const backupPath of result.data) {
        try {
          // Parse backup filename to extract info
          const fileName = backupPath.split('/').pop() || '';
          const match = fileName.match(/^(.+)\.backup\.(.+)$/);
          
          if (match) {
            const [, originalName, timestamp] = match;
            
            // Get file size (simplified - in real implementation you'd call a stat command)
            backups.push({
              path: backupPath,
              originalFile: originalName,
              timestamp: new Date(timestamp.replace(/-/g, ':')).getTime(),
              size: 0 // Would need a file stat command
            });
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse backup info:', backupPath, error);
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return [];
    }
  }

  async cleanupOldBackups(maxAgeDays: number = 30): Promise<number> {
    if (!this.initialized) await this.initialize();
    
    const backups = await this.listBackups();
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const oldBackups = backups.filter(backup => backup.timestamp < cutoffTime);
    
    let deletedCount = 0;
    
    for (const backup of oldBackups) {
      try {
        await invoke<TauriResult<string>>('delete_file', { path: backup.path });
        deletedCount++;
        console.log('🗑️ Deleted old backup:', backup.path);
      } catch (error) {
        console.warn('⚠️ Failed to delete backup:', backup.path, error);
      }
    }
    
    console.log(`🧹 Cleaned up ${deletedCount} old backup files`);
    return deletedCount;
  }

  private generateProjectHash(filePath: string): string {
    // Simple hash based on the project root (first 2-3 directory levels)
    const pathParts = filePath.split('/');
    const projectPath = pathParts.slice(0, Math.min(3, pathParts.length - 1)).join('/');
    
    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < projectPath.length; i++) {
      const char = projectPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
}

// ================================
// ENHANCED HOOK IMPLEMENTATION
// ================================

export function useFileSave() {
  // State management
  const [saveConfig] = useState<SaveConfig>({
    autoSaveEnabled: true,
    autoSaveDelay: 2000,
    backupOnFailure: false, // 🔥 DISABLED by default - only create backups when saves actually fail
    enableRecovery: true,
    maxBackupRetention: 30,
    compressionEnabled: false,
    performanceMonitoring: true,
  });

  const [currentlySaving, setCurrentlySaving] = useState<Set<string>>(new Set());
  const [saveHistory, setSaveHistory] = useState<SaveResult[]>([]);
  const [recoveryData] = useState<Map<string, RecoveryData>>(new Map());
  
  // Refs for performance and cleanup
  const autoSaveTimers = useRef<Map<string, number>>(new Map());
  const performanceRef = useRef<Map<string, number>>(new Map());
  const backupManager = useRef(new BackupManager());
  
  // Initialize backup system
  useEffect(() => {
    backupManager.current.initialize().catch(console.error);
    
    // Cleanup old backups on startup
    backupManager.current.cleanupOldBackups(saveConfig.maxBackupRetention).catch(console.error);
  }, [saveConfig.maxBackupRetention]);

  // ================================
  // CORE SAVE FUNCTIONALITY
  // ================================

  const saveFile = useCallback(async (
    filePath: string, 
    content: string,
    options: { 
      createBackup?: boolean;
      silent?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<SaveResult> => {
    const startTime = Date.now();
    const saveId = `${filePath}_${Date.now()}`;
    
    // Set saving state
    setCurrentlySaving(prev => new Set([...prev, filePath]));
    
    if (saveConfig.performanceMonitoring) {
      performanceRef.current.set(saveId, startTime);
    }
    
    try {
      // Validate file path if not skipped
      if (!options.skipValidation && (!filePath || filePath.trim() === '')) {
        throw new Error('Invalid file path provided');
      }
      
      // 🔥 ONLY create backup if explicitly requested or save fails
      let backupPath: string | undefined;
      
      try {
        // Attempt to save the file
        const saveResult = await invoke<TauriResult<string>>('save_file', { 
          path: filePath, 
          content 
        });
        
        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Save operation failed');
        }
        
        // Save successful - no backup needed unless explicitly requested
        if (options.createBackup) {
          try {
            backupPath = await backupManager.current.createBackup(filePath, content);
          } catch (backupError) {
            console.warn('⚠️ Failed to create requested backup:', backupError);
          }
        }
        
      } catch (saveError) {
        // Save failed - create backup if enabled
        if (saveConfig.backupOnFailure) {
          try {
            backupPath = await backupManager.current.createBackup(filePath, content);
            console.log('💾 Created backup due to save failure:', backupPath);
          } catch (backupError) {
            console.error('❌ Failed to create backup after save failure:', backupError);
          }
        }
        
        // Re-throw the original save error
        throw saveError;
      }
      
      const performanceMs = Date.now() - startTime;
      
      const result: SaveResult = {
        success: true,
        filePath,
        timestamp: Date.now(),
        backupCreated: !!backupPath,
        backupPath,
        performanceMs: saveConfig.performanceMonitoring ? performanceMs : undefined,
      };
      
      // Update save history
      setSaveHistory(prev => [result, ...prev.slice(0, 49)]); // Keep last 50 saves
      
      if (!options.silent) {
        console.log(`✅ File saved successfully: ${filePath}${backupPath ? ` (backup: ${backupPath})` : ''}`);
        
        if (saveConfig.performanceMonitoring && performanceMs > 1000) {
          console.warn(`⚠️ Slow save detected: ${performanceMs}ms for ${filePath}`);
        }
      }
      
      return result;
      
    } catch (error) {
      const errorResult: SaveResult = {
        success: false,
        filePath,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        performanceMs: saveConfig.performanceMonitoring ? Date.now() - startTime : undefined,
      };
      
      setSaveHistory(prev => [errorResult, ...prev.slice(0, 49)]);
      
      if (!options.silent) {
        console.error(`❌ Failed to save file: ${filePath}`, error);
      }
      
      return errorResult;
      
    } finally {
      // Cleanup
      setCurrentlySaving(prev => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });
      
      if (saveConfig.performanceMonitoring) {
        performanceRef.current.delete(saveId);
      }
    }
  }, [saveConfig]);
  
  // ================================
  // AUTO-SAVE FUNCTIONALITY
  // ================================

  const scheduleAutoSave = useCallback((filePath: string, content: string) => {
    if (!saveConfig.autoSaveEnabled) return;
    
    // Clear existing timer for this file
    const existingTimer = autoSaveTimers.current.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule new auto-save
    const timer = setTimeout(() => {
      saveFile(filePath, content, { silent: true, createBackup: false })
        .catch(error => console.warn('Auto-save failed:', error));
      autoSaveTimers.current.delete(filePath);
    }, saveConfig.autoSaveDelay);
    
    autoSaveTimers.current.set(filePath, timer);
  }, [saveConfig.autoSaveEnabled, saveConfig.autoSaveDelay, saveFile]);

  const cancelAutoSave = useCallback((filePath: string) => {
    const timer = autoSaveTimers.current.get(filePath);
    if (timer) {
      clearTimeout(timer);
      autoSaveTimers.current.delete(filePath);
    }
  }, []);
  
  // ================================
  // SAVE ALL FUNCTIONALITY
  // ================================

  const saveAllFiles = useCallback(async (files: EditorFile[]): Promise<SaveResult[]> => {
    console.log(`💾 Starting Save All operation for ${files.length} files`);
    
    const results: SaveResult[] = [];
    const startTime = Date.now();
    
    // Save files in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 3;
    const chunks = [];
    
    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
      chunks.push(files.slice(i, i + CONCURRENCY_LIMIT));
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(file => 
          saveFile(file.path, file.content, { silent: true, createBackup: false })
        )
      );
      results.push(...chunkResults);
    }
    
    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`✅ Save All completed: ${successCount} saved, ${failureCount} failed in ${totalTime}ms`);
    
    return results;
  }, [saveFile]);

  // Register Save All keyboard shortcut (Ctrl+Alt+S)
  useShortcut('fileManagement', 'saveAll', () => {
    announceShortcut('Save All', '🎮 Save All triggered');
    // Note: This would need to be connected to the actual file list in the parent component
  });
  
  // ================================
  // BACKUP MANAGEMENT
  // ================================

  const createManualBackup = useCallback(async (filePath: string, content: string): Promise<string> => {
    return await backupManager.current.createBackup(filePath, content);
  }, []);

  const listAvailableBackups = useCallback(async (): Promise<BackupInfo[]> => {
    return await backupManager.current.listBackups();
  }, []);

  const cleanupBackups = useCallback(async (maxAgeDays?: number): Promise<number> => {
    return await backupManager.current.cleanupOldBackups(maxAgeDays || saveConfig.maxBackupRetention);
  }, [saveConfig.maxBackupRetention]);
  
  // ================================
  // CLEANUP AND PERFORMANCE
  // ================================

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      autoSaveTimers.current.forEach(timer => clearTimeout(timer));
      autoSaveTimers.current.clear();
    };
  }, []);

  // ================================
  // PUBLIC API
  // ================================

  return {
    // Core save operations
    saveFile,
    saveAllFiles,
    
    // Auto-save controls
    scheduleAutoSave,
    cancelAutoSave,
    
    // Backup management (VS Code style)
    createManualBackup,
    listAvailableBackups,
    cleanupBackups,
    
    // State and monitoring
    currentlySaving: Array.from(currentlySaving),
    saveHistory,
    recoveryData,
    saveConfig,
    
    // Utilities
    isSaving: (filePath: string) => currentlySaving.has(filePath),
    getLastSaveResult: (filePath: string) => saveHistory.find(h => h.filePath === filePath),
  };
} 