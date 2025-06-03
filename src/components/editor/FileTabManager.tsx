// Syntari AI IDE - Enhanced File Tab Manager
// Specialized tab manager for file editing with unsaved changes support

import React, { useState, useCallback, useMemo } from 'react';
import { TabLayout, useTabManager, Tab } from '../TabLayout';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import type { FileInfo } from '../../types';
import { getFileIcon } from '../../utils/editorUtils';

interface FileTabManagerProps {
  openFiles: FileInfo[];
  activeFileId: string | null;
  onFileSelect: (file: FileInfo) => void;
  onFileClose: (fileId: string) => void;
  onFileSave: (fileId: string) => Promise<void>;
  onNewFile?: () => void;
  className?: string;
  renderFileContent: (file: FileInfo) => React.ReactNode;
  unsavedChanges: Record<string, boolean>; // fileId -> hasChanges
}

export const FileTabManager: React.FC<FileTabManagerProps> = ({
  openFiles,
  activeFileId,
  onFileSelect,
  onFileClose,
  onFileSave,
  onNewFile,
  className,
  renderFileContent,
  unsavedChanges,
}) => {
  const [unsavedDialog, setUnsavedDialog] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
    action: 'close' | 'close-others' | 'close-all';
  }>({ isOpen: false, fileId: '', fileName: '', action: 'close' });

  // Convert files to tabs
  const fileTabs = useMemo<Tab[]>(() => {
    return openFiles.map(file => ({
      id: file.path,
      title: file.name,
      icon: getFileIcon(file.extension),
      closeable: true,
      modified: unsavedChanges[file.path] || false,
      pinned: false, // Could be extended to support pinned files
      filePath: file.path,
      content: renderFileContent(file),
    }));
  }, [openFiles, unsavedChanges, renderFileContent]);

  const tabManager = useTabManager(fileTabs);

  // Sync active tab with external state
  React.useEffect(() => {
    if (activeFileId && activeFileId !== tabManager.activeTabId) {
      tabManager.switchToTab(activeFileId);
    }
  }, [activeFileId, tabManager]);

  // Handle tab selection
  const handleTabChange = useCallback((tabId: string) => {
    const file = openFiles.find(f => f.path === tabId);
    if (file) {
      onFileSelect(file);
    }
  }, [openFiles, onFileSelect]);

  // Handle unsaved changes warning
  const handleUnsavedChangesWarning = useCallback(async (tabId: string): Promise<boolean> => {
    const hasChanges = unsavedChanges[tabId];
    if (!hasChanges) return true;

    const file = openFiles.find(f => f.path === tabId);
    if (!file) return true;

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
  }, [unsavedChanges, openFiles]);

  // Handle dialog actions
  const handleDialogSave = useCallback(async () => {
    const { fileId } = unsavedDialog;
    try {
      await onFileSave(fileId);
      setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
      (window as any).__unsavedDialogResolve?.(true);
    } catch (error) {
      console.error('Failed to save file:', error);
      // Don't close the dialog on save error
    }
  }, [unsavedDialog, onFileSave]);

  const handleDialogDontSave = useCallback(() => {
    setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
    (window as any).__unsavedDialogResolve?.(true);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setUnsavedDialog(prev => ({ ...prev, isOpen: false }));
    (window as any).__unsavedDialogResolve?.(false);
  }, []);

  // Handle tab closing
  const handleTabClose = useCallback(async (tabId: string) => {
    const shouldClose = await handleUnsavedChangesWarning(tabId);
    if (shouldClose) {
      onFileClose(tabId);
    }
  }, [handleUnsavedChangesWarning, onFileClose]);

  // Handle tab reordering
  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    // Could implement file order persistence here
    console.log('Reorder tabs:', fromIndex, '->', toIndex);
  }, []);

  return (
    <>
      <TabLayout
        tabs={fileTabs}
        activeTabId={activeFileId || ''}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onTabReorder={handleTabReorder}
        onUnsavedChangesWarning={handleUnsavedChangesWarning}
        onNewTab={onNewFile}
        className={className}
        enableKeyboardNavigation={true}
        enableContextMenu={true}
      />

      <UnsavedChangesDialog
        isOpen={unsavedDialog.isOpen}
        fileName={unsavedDialog.fileName}
        onSave={handleDialogSave}
        onDontSave={handleDialogDontSave}
        onCancel={handleDialogCancel}
      />
    </>
  );
}; 