// Syntari AI IDE - Enterprise File Tab Manager
// Advanced file-specific tab management with business intelligence, performance optimization, and accessibility

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TabLayout, useTabManager, Tab } from '../TabLayout';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';
import { announceShortcut } from '../../utils/keyboardUtils';
import type { FileInfo } from '../../types';
import { getFileIcon } from '../../utils/editorUtils';

// ================================
// ENHANCED TYPES & INTERFACES
// ================================

interface FileTabManagerProps {
  openFiles: FileInfo[];
  activeFileId: string | null;
  onFileSelect: (file: FileInfo) => void;
  onFileClose: (fileId: string) => void;
  onFileSave: (fileId: string) => Promise<void>;
  onNewFile?: () => void;
  onFileDuplicate?: (fileId: string) => void;
  onFileReveal?: (fileId: string) => void;
  onFilePrint?: (fileId: string) => void;
  onFilesReorder?: (reorderedFiles: FileInfo[]) => void;
  className?: string;
  renderFileContent: (file: FileInfo) => React.ReactNode;
  unsavedChanges: Record<string, boolean>; // fileId -> hasChanges
  fileSizes?: Record<string, number>; // fileId -> size in bytes
  enablePerformanceTracking?: boolean;
  enablePersistence?: boolean;
  maxOpenFiles?: number;
  enableFilePreview?: boolean;
  autoSaveDelay?: number;
  tabGrouping?: 'none' | 'project' | 'type';
}

interface FileTabMetrics {
  totalTabs: number;
  unsavedTabs: number;
  totalMemoryUsage: number;
  averageFileSize: number;
  mostRecentlyUsed: string[];
  tabSwitchCount: number;
  averageTabLifetime: number;
}

interface TabOperation {
  type: 'open' | 'close' | 'switch' | 'save' | 'duplicate' | 'reorder';
  fileId: string;
  timestamp: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

// ================================
// ENTERPRISE FILE TAB MANAGER CLASS
// ================================

class EnterpriseFileTabManager {
  private metrics: FileTabMetrics = {
    totalTabs: 0,
    unsavedTabs: 0,
    totalMemoryUsage: 0,
    averageFileSize: 0,
    mostRecentlyUsed: [],
    tabSwitchCount: 0,
    averageTabLifetime: 0
  };

  private operations: TabOperation[] = [];
  private tabLifetimes = new Map<string, number>(); // fileId -> open timestamp
  private readonly maxOperationHistory = 1000;
  private readonly storageKey = 'syntari-file-tabs';

  calculateMetrics(files: FileInfo[], unsavedChanges: Record<string, boolean>, fileSizes?: Record<string, number>): FileTabMetrics {
    const totalTabs = files.length;
    const unsavedTabs = Object.values(unsavedChanges).filter(Boolean).length;
    const totalMemoryUsage = fileSizes ? Object.values(fileSizes).reduce((sum, size) => sum + size, 0) : 0;
    const averageFileSize = totalTabs > 0 && fileSizes ? totalMemoryUsage / totalTabs : 0;

    // Calculate tab switch frequency
    const switchOperations = this.operations.filter(op => op.type === 'switch');
    const tabSwitchCount = switchOperations.length;

    // Calculate average tab lifetime
    const closeOperations = this.operations.filter(op => op.type === 'close');
    const totalLifetime = closeOperations.reduce((sum, op) => {
      const openTime = this.tabLifetimes.get(op.fileId);
      return openTime ? sum + (op.timestamp - openTime) : sum;
    }, 0);
    const averageTabLifetime = closeOperations.length > 0 ? totalLifetime / closeOperations.length : 0;

    this.metrics = {
      totalTabs,
      unsavedTabs,
      totalMemoryUsage,
      averageFileSize,
      mostRecentlyUsed: this.getMostRecentlyUsed(),
      tabSwitchCount,
      averageTabLifetime
    };

    return this.metrics;
  }

  recordOperation(operation: TabOperation): void {
    this.operations.push(operation);

    // Track tab lifetimes
    if (operation.type === 'open') {
      this.tabLifetimes.set(operation.fileId, operation.timestamp);
    } else if (operation.type === 'close') {
      this.tabLifetimes.delete(operation.fileId);
    }

    // Maintain operation history limit
    if (this.operations.length > this.maxOperationHistory) {
      this.operations = this.operations.slice(-this.maxOperationHistory);
    }
  }

  getMostRecentlyUsed(limit: number = 10): string[] {
    const switchOps = this.operations
      .filter(op => op.type === 'switch')
      .sort((a, b) => b.timestamp - a.timestamp);
    
    const seen = new Set<string>();
    const mru: string[] = [];

    for (const op of switchOps) {
      if (!seen.has(op.fileId) && mru.length < limit) {
        seen.add(op.fileId);
        mru.push(op.fileId);
      }
    }

    return mru;
  }

  getMetrics(): FileTabMetrics {
    return { ...this.metrics };
  }

  logBusinessImpact(action: string, context: any): void {
    console.log(`📊 FileTabManager Business Impact: ${action}`, {
      timestamp: new Date().toISOString(),
      action,
      context,
      metrics: this.getMetrics()
    });
  }

  saveState(files: FileInfo[], activeFileId: string | null): void {
    try {
      const state = {
        openFiles: files.map(f => ({ path: f.path, name: f.name })),
        activeFileId,
        metrics: this.metrics,
        timestamp: Date.now(),
        version: '2.0.0'
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save file tab state:', error);
    }
  }

  loadState(): { openFiles: Partial<FileInfo>[], activeFileId: string | null } | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const state = JSON.parse(stored);
        return {
          openFiles: state.openFiles || [],
          activeFileId: state.activeFileId || null
        };
      }
    } catch (error) {
      console.error('Failed to load file tab state:', error);
    }
    return null;
  }
}

// ================================
// ENHANCED UNSAVED CHANGES DIALOG
// ================================

interface EnhancedUnsavedChangesDialogProps {
  isOpen: boolean;
  fileName: string;
  fileSize?: number;
  lastModified?: number;
  action: 'close' | 'close-others' | 'close-all' | 'switch';
  onSave: () => Promise<void>;
  onDontSave: () => void;
  onCancel: () => void;
  enableAutoSave?: boolean;
  onEnableAutoSave?: () => void;
}

const EnhancedUnsavedChangesDialog: React.FC<EnhancedUnsavedChangesDialogProps> = ({
  isOpen,
  fileName,
  fileSize,
  lastModified,
  action,
  onSave,
  onDontSave,
  onCancel,
  enableAutoSave = false,
  onEnableAutoSave,
}) => {
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Enhanced keyboard shortcuts
  useShortcut('dialog', 'save', useCallback((e) => {
    if (!isOpen) return;
    e.preventDefault?.();
    
    setSaving(true);
    onSave().then(() => {
      announceShortcut('Save and Close', `Saved ${fileName}`);
    }).catch((error) => {
      console.error('Save failed:', error);
    }).finally(() => {
      setSaving(false);
    });
  }, [isOpen, onSave, fileName]));

  useShortcut('dialog', 'cancel', useCallback((e) => {
    if (!isOpen) return;
    e.preventDefault?.();
    onCancel();
    announceShortcut('Cancel', 'Cancelled file operation');
  }, [isOpen, onCancel]));

  // Focus management
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const saveButton = dialogRef.current.querySelector('[data-action="save"]') as HTMLButtonElement;
      saveButton?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActionMessage = () => {
    switch (action) {
      case 'close':
        return `Do you want to save changes to "${fileName}" before closing?`;
      case 'close-others':
        return `Do you want to save changes to "${fileName}" before closing other tabs?`;
      case 'close-all':
        return `Do you want to save changes to "${fileName}" before closing all tabs?`;
      case 'switch':
        return `Do you want to save changes to "${fileName}" before switching tabs?`;
      default:
        return `Do you want to save changes to "${fileName}"?`;
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatLastModified = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div 
        ref={dialogRef}
        className="bg-vscode-bg border border-vscode-border rounded-lg shadow-xl max-w-md w-full mx-4"
        role="alertdialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-vscode-border">
          <h2 id="dialog-title" className="text-lg font-semibold text-vscode-fg flex items-center">
            <span className="mr-2 text-yellow-500">⚠️</span>
            Unsaved Changes
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p id="dialog-description" className="text-vscode-fg mb-4">
            {getActionMessage()}
          </p>

          {/* File Details */}
          <div className="bg-vscode-sidebar rounded-lg p-3 mb-4 text-sm">
            <div className="font-medium text-vscode-fg mb-2">File Details:</div>
            <div className="space-y-1 text-vscode-fg-muted">
              <div>Name: {fileName}</div>
              {fileSize && <div>Size: {formatFileSize(fileSize)}</div>}
              {lastModified && <div>Modified: {formatLastModified(lastModified)}</div>}
            </div>
          </div>

          {/* Auto-save Option */}
          {onEnableAutoSave && (
            <div className="mb-4">
              <label className="flex items-center text-sm text-vscode-fg">
                <input
                  type="checkbox"
                  checked={enableAutoSave}
                  onChange={onEnableAutoSave}
                  className="mr-2 rounded border-vscode-border"
                />
                Enable auto-save to prevent this dialog in the future
              </label>
            </div>
          )}

          <div className="text-xs text-vscode-fg-muted">
            💡 Tip: Use Ctrl+S to save files regularly
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-vscode-border flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-vscode-fg border border-vscode-border rounded hover:bg-vscode-list-hover transition-colors focus:outline-none focus:ring-2 focus:ring-vscode-accent"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button
            onClick={onDontSave}
            className="px-4 py-2 text-red-400 border border-red-500/20 rounded hover:bg-red-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={saving}
          >
            Don't Save
          </button>
          
          <button
            data-action="save"
            onClick={async () => {
              setSaving(true);
              try {
                await onSave();
              } finally {
                setSaving(false);
              }
            }}
            className="px-4 py-2 bg-vscode-accent text-vscode-accent-fg rounded hover:bg-vscode-accent/80 transition-colors focus:outline-none focus:ring-2 focus:ring-vscode-accent disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================
// ENHANCED FILE TAB MANAGER COMPONENT
// ================================

export const FileTabManager: React.FC<FileTabManagerProps> = ({
  openFiles,
  activeFileId,
  onFileSelect,
  onFileClose,
  onFileSave,
  onNewFile,
  onFilesReorder,
  className,
  renderFileContent,
  unsavedChanges,
  fileSizes,
  enablePerformanceTracking = true,
  enablePersistence = true,
  maxOpenFiles = 20,
  tabGrouping = 'none',
}) => {
  const [unsavedDialog, setUnsavedDialog] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
    action: 'close' | 'close-others' | 'close-all' | 'switch';
  }>({ isOpen: false, fileId: '', fileName: '', action: 'close' });

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const managerRef = useRef(new EnterpriseFileTabManager());

  // Enhanced file processing with grouping
  const processedFiles = useMemo(() => {
    const result = [...openFiles];

    // Apply file limits
    if (result.length > maxOpenFiles) {
      console.warn(`Too many files open (${result.length}>${maxOpenFiles}). Consider closing some tabs.`);
    }

    // Group files if enabled
    if (tabGrouping === 'project') {
      result.sort((a, b) => {
        const projectA = a.path.split('/')[0] || '';
        const projectB = b.path.split('/')[0] || '';
        return projectA.localeCompare(projectB);
      });
    } else if (tabGrouping === 'type') {
      result.sort((a, b) => {
        const extA = a.extension || '';
        const extB = b.extension || '';
        return extA.localeCompare(extB);
      });
    }

    return result;
  }, [openFiles, maxOpenFiles, tabGrouping]);

  // Convert files to enhanced tabs with metadata
  const fileTabs = useMemo<Tab[]>(() => {
    return processedFiles.map(file => {
      const fileSize = fileSizes?.[file.path] || 0;
      const isModified = unsavedChanges[file.path] || false;

      return {
      id: file.path,
      title: file.name,
      icon: getFileIcon(file.extension),
      closeable: true,
        modified: isModified,
        pinned: false,
      filePath: file.path,
        size: fileSize,
        metadata: {
          extension: file.extension,
          lastModified: file.lastModified,
          isStarred: false, // Could be extended
          project: file.path.split('/')[0] || 'Unknown'
        },
      content: renderFileContent(file),
      };
    });
  }, [processedFiles, unsavedChanges, fileSizes, renderFileContent]);

  const tabManager = useTabManager(fileTabs);

  // Performance and business metrics calculation
  const tabMetrics = useMemo(() => {
    return managerRef.current.calculateMetrics(openFiles, unsavedChanges, fileSizes);
  }, [openFiles, unsavedChanges, fileSizes]);

  // Sync active tab with external state
  useEffect(() => {
    if (activeFileId && activeFileId !== tabManager.activeTabId) {
      tabManager.switchToTab(activeFileId);
      
      // Record operation
      if (enablePerformanceTracking) {
        managerRef.current.recordOperation({
          type: 'switch',
          fileId: activeFileId,
          timestamp: Date.now()
        });
      }
    }
  }, [activeFileId, tabManager, enablePerformanceTracking]);

  // State persistence
  useEffect(() => {
    if (enablePersistence) {
      managerRef.current.saveState(openFiles, activeFileId);
    }
  }, [openFiles, activeFileId, enablePersistence]);

  // Enhanced keyboard shortcuts
  useShortcut('fileManagement', 'saveAll', useCallback((e) => {
    e.preventDefault?.();
    const unsavedFiles = openFiles.filter(f => unsavedChanges[f.path]);
    
    if (unsavedFiles.length === 0) {
      announceShortcut('Save All', 'No files need saving');
      return;
    }

    Promise.all(unsavedFiles.map(f => onFileSave(f.path)))
      .then(() => {
        announceShortcut('Save All', `Saved ${unsavedFiles.length} files`);
        managerRef.current.logBusinessImpact('save_all', { fileCount: unsavedFiles.length });
      })
      .catch((error) => {
        console.error('Failed to save all files:', error);
      });
  }, [openFiles, unsavedChanges, onFileSave]));

  // Enhanced tab selection with business tracking
  const handleTabChange = useCallback((tabId: string) => {
    const file = openFiles.find(f => f.path === tabId);
    if (file) {
      onFileSelect(file);
      
      // Record business impact
      if (enablePerformanceTracking) {
        managerRef.current.logBusinessImpact('file_select', {
          fileName: file.name,
          fileType: file.extension,
          fileSize: fileSizes?.[file.path] || 0
        });
      }
    }
  }, [openFiles, onFileSelect, enablePerformanceTracking, fileSizes]);

  // Enhanced unsaved changes warning with auto-save option
  const handleUnsavedChangesWarning = useCallback(async (tabId: string): Promise<boolean> => {
    const hasChanges = unsavedChanges[tabId];
    if (!hasChanges) return true;

    const file = openFiles.find(f => f.path === tabId);
    if (!file) return true;

    // Auto-save if enabled
    if (autoSaveEnabled) {
      try {
        await onFileSave(tabId);
        announceShortcut('Auto Save', `Auto-saved ${file.name}`);
        return true;
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Fall through to dialog
      }
    }

    return new Promise((resolve) => {
      setUnsavedDialog({
        isOpen: true,
        fileId: tabId,
        fileName: file.name,
        action: 'close',
      });

      // Store resolve function for dialog actions
      (window as any).__unsavedDialogResolve = resolve;
    });
  }, [unsavedChanges, openFiles, autoSaveEnabled, onFileSave]);

  // Enhanced dialog actions with performance tracking
  const handleDialogSave = useCallback(async () => {
    const { fileId } = unsavedDialog;
    const startTime = performance.now();
    
    try {
      await onFileSave(fileId);
      setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
      (window as any).__unsavedDialogResolve?.(true);
      
      // Record successful operation
      if (enablePerformanceTracking) {
        managerRef.current.recordOperation({
          type: 'save',
          fileId,
          timestamp: Date.now(),
          duration: performance.now() - startTime,
          success: true
        });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      
      // Record failed operation
      if (enablePerformanceTracking) {
        managerRef.current.recordOperation({
          type: 'save',
          fileId,
          timestamp: Date.now(),
          duration: performance.now() - startTime,
          success: false,
          error: String(error)
        });
      }
    }
  }, [unsavedDialog, onFileSave, enablePerformanceTracking]);

  const handleDialogDontSave = useCallback(() => {
    setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
    (window as any).__unsavedDialogResolve?.(true);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
    (window as any).__unsavedDialogResolve?.(false);
  }, []);

  // Enhanced tab closing with business tracking
  const handleTabClose = useCallback(async (tabId: string) => {
    const startTime = performance.now();
    
    try {
    const shouldClose = await handleUnsavedChangesWarning(tabId);
    if (shouldClose) {
      onFileClose(tabId);
        
        // Record successful operation
        if (enablePerformanceTracking) {
          managerRef.current.recordOperation({
            type: 'close',
            fileId: tabId,
            timestamp: Date.now(),
            duration: performance.now() - startTime,
            success: true
          });
        }
      }
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  }, [handleUnsavedChangesWarning, onFileClose, enablePerformanceTracking]);

  // Enhanced tab reordering with persistence
  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    // Record business impact
    managerRef.current.logBusinessImpact('tab_reorder', {
      fromIndex,
      toIndex,
      totalTabs: openFiles.length
    });
    
    // Actually reorder the files array
    const reorderedFiles = [...openFiles];
    const [movedFile] = reorderedFiles.splice(fromIndex, 1);
    reorderedFiles.splice(toIndex, 0, movedFile);
    
    // Call the onFilesReorder callback with the reordered files
    onFilesReorder?.(reorderedFiles);
  }, [openFiles, onFilesReorder]);

  // Enhanced split view support
  const handleSplitView = useCallback((orientation: 'horizontal' | 'vertical') => {
    managerRef.current.logBusinessImpact('split_view', { orientation });
    console.log('Split view:', orientation);
  }, []);

  // Enhanced tab actions
  const handleTabDoubleClick = useCallback((tabId: string) => {
    // Could implement tab pinning or other actions
    managerRef.current.logBusinessImpact('tab_double_click', { tabId });
  }, []);

  const handleNewFile = useCallback(() => {
    if (onNewFile) {
      onNewFile();
      managerRef.current.logBusinessImpact('new_file', { totalTabs: openFiles.length });
    }
  }, [onNewFile, openFiles.length]);

  return (
    <>
      <TabLayout
        tabs={fileTabs}
        activeTabId={activeFileId || ''}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onTabReorder={handleTabReorder}
        onUnsavedChangesWarning={handleUnsavedChangesWarning}
        onNewTab={handleNewFile}
        onSplitView={handleSplitView}
        onTabDoubleClick={handleTabDoubleClick}
        className={className}
        enableKeyboardNavigation={true}
        enableContextMenu={true}
        enableVirtualScrolling={openFiles.length > 15}
        maxVisibleTabs={15}
        showTabMetrics={enablePerformanceTracking}
        persistState={enablePersistence}
        stateKey="file-tabs"
      />

      {/* Enhanced Unsaved Changes Dialog */}
      <EnhancedUnsavedChangesDialog
        isOpen={unsavedDialog.isOpen}
        fileName={unsavedDialog.fileName}
        fileSize={fileSizes?.[unsavedDialog.fileId]}
        lastModified={openFiles.find(f => f.path === unsavedDialog.fileId)?.lastModified}
        action={unsavedDialog.action}
        onSave={handleDialogSave}
        onDontSave={handleDialogDontSave}
        onCancel={handleDialogCancel}
        enableAutoSave={autoSaveEnabled}
        onEnableAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
      />

      {/* Performance Warning */}
      {enablePerformanceTracking && openFiles.length > maxOpenFiles && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg z-40">
          <div className="text-sm font-medium">⚠️ Performance Warning</div>
          <div className="text-xs">
            {openFiles.length} tabs open. Consider closing some for better performance.
          </div>
        </div>
      )}

      {/* Tab Metrics Display */}
      {enablePerformanceTracking && (
        <div className="fixed bottom-4 left-4 bg-vscode-bg border border-vscode-border rounded-lg p-3 text-xs z-40">
          <div className="font-medium text-vscode-fg mb-1">📊 Tab Metrics</div>
          <div className="space-y-1 text-vscode-fg-muted">
            <div>Tabs: {tabMetrics.totalTabs} ({tabMetrics.unsavedTabs} unsaved)</div>
            <div>Memory: {(tabMetrics.totalMemoryUsage / 1024 / 1024).toFixed(1)}MB</div>
            <div>Switches: {tabMetrics.tabSwitchCount}</div>
          </div>
        </div>
      )}
    </>
  );
}; 