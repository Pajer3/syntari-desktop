// Syntari AI IDE - Context Menu Integration Hook
// Provides easy integration between context menu and services

import { useCallback } from 'react';
import { contextMenuService } from '../services/contextMenuService';
import { fileContextMenu, tabContextMenu, editorContextMenu } from '../components/ui/ContextMenu';

export const useContextMenuIntegration = () => {
  
  // ================================
  // FILE CONTEXT MENU
  // ================================
  
  const createFileContextMenu = useCallback((filePath: string, isDirectory: boolean) => {
    return fileContextMenu(filePath, isDirectory, {
      onOpen: async (path: string) => {
        if (isDirectory) {
          await contextMenuService.openFolder(path);
        } else {
          await contextMenuService.openFile(path);
        }
      },
      
      onCut: async (path: string) => {
        await contextMenuService.cutFile(path);
      },
      
      onCopy: async (path: string) => {
        await contextMenuService.copyFile(path);
      },
      
      onPaste: async (targetPath: string) => {
        await contextMenuService.pasteFile(targetPath);
      },
      
      onRename: async (path: string) => {
        await contextMenuService.renameFile(path);
      },
      
      onDelete: async (path: string) => {
        await contextMenuService.deleteFile(path);
      },
      
      onProperties: async (path: string) => {
        await contextMenuService.showFileProperties(path);
      },
      
      onOpenWith: async (path: string, application: string) => {
        await contextMenuService.openWith(path, application);
      },
    });
  }, []);

  // ================================
  // TAB CONTEXT MENU
  // ================================
  
  const createTabContextMenu = useCallback((tabIndex: number, isPinned: boolean) => {
    return tabContextMenu(tabIndex, isPinned, {
      onClose: (index: number) => {
        contextMenuService.closeTab(index);
      },
      
      onCloseOthers: (index: number) => {
        contextMenuService.closeOtherTabs(index);
      },
      
      onCloseToRight: (index: number) => {
        contextMenuService.closeTabsToRight(index);
      },
      
      onTogglePin: (index: number) => {
        contextMenuService.toggleTabPin(index);
      },
      
      onSplitRight: (index: number) => {
        contextMenuService.splitTabRight(index);
      },
      
      onSplitDown: (index: number) => {
        contextMenuService.splitTabDown(index);
      },
    });
  }, []);

  // ================================
  // EDITOR CONTEXT MENU
  // ================================
  
  const createEditorContextMenu = useCallback((hasSelection: boolean) => {
    return editorContextMenu(hasSelection, {
      onCut: () => {
        contextMenuService.cutSelection();
      },
      
      onCopy: () => {
        contextMenuService.copySelection();
      },
      
      onPaste: () => {
        contextMenuService.pasteToEditor();
      },
      
      onSelectAll: () => {
        contextMenuService.selectAll();
      },
      
      onFind: () => {
        contextMenuService.openFind();
      },
      
      onReplace: () => {
        contextMenuService.openReplace();
      },
      
      onFormat: () => {
        contextMenuService.formatDocument();
      },
      
      onAIAssistant: () => {
        contextMenuService.openAIAssistant();
      },
    });
  }, []);

  // ================================
  // CLIPBOARD STATUS
  // ================================
  
  const getClipboardStatus = useCallback(() => {
    return contextMenuService.getClipboardStatus();
  }, []);

  const clearClipboard = useCallback(() => {
    contextMenuService.clearClipboard();
  }, []);

  // ================================
  // RETURN API
  // ================================
  
  return {
    // Context menu creators
    createFileContextMenu,
    createTabContextMenu,
    createEditorContextMenu,
    
    // Clipboard utilities
    getClipboardStatus,
    clearClipboard,
    
    // Direct service access for advanced use cases
    contextMenuService,
  };
};

// ================================
// EVENT LISTENER HOOKS
// ================================

export const useContextMenuEvents = () => {
  // Hook for components to listen to context menu events
  // Usage: const events = useContextMenuEvents();
  //        useEffect(() => events.onFileOpen((detail) => {...}), []);
  
  const addEventListener = useCallback((eventType: string, handler: (detail: any) => void) => {
    const listener = (event: CustomEvent) => {
      handler(event.detail);
    };
    
    window.addEventListener(eventType, listener as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener(eventType, listener as EventListener);
    };
  }, []);

  return {
    onFileOpen: (handler: (detail: { path: string; content: string }) => void) =>
      addEventListener('file-open', handler),
      
    onFolderOpen: (handler: (detail: { path: string }) => void) =>
      addEventListener('folder-open', handler),
      
    onFileCut: (handler: (detail: { path: string }) => void) =>
      addEventListener('file-cut', handler),
      
    onFileCopied: (handler: (detail: { path: string }) => void) =>
      addEventListener('file-copied', handler),
      
    onFileTreeRefresh: (handler: () => void) =>
      addEventListener('file-tree-refresh', () => handler()),
      
    onFileRenameRequest: (handler: (detail: { path: string }) => void) =>
      addEventListener('file-rename-request', handler),
      
    onFileProperties: (handler: (detail: { path: string; size: number; modified: string; permissions: string }) => void) =>
      addEventListener('file-properties', handler),
      
    onTabClose: (handler: (detail: { index: number }) => void) =>
      addEventListener('tab-close', handler),
      
    onTabCloseOthers: (handler: (detail: { keepIndex: number }) => void) =>
      addEventListener('tab-close-others', handler),
      
    onTabCloseToRight: (handler: (detail: { fromIndex: number }) => void) =>
      addEventListener('tab-close-to-right', handler),
      
    onTabTogglePin: (handler: (detail: { index: number }) => void) =>
      addEventListener('tab-toggle-pin', handler),
      
    onTabSplitRight: (handler: (detail: { index: number }) => void) =>
      addEventListener('tab-split-right', handler),
      
    onTabSplitDown: (handler: (detail: { index: number }) => void) =>
      addEventListener('tab-split-down', handler),
      
    onEditorFind: (handler: () => void) =>
      addEventListener('editor-find', () => handler()),
      
    onEditorReplace: (handler: () => void) =>
      addEventListener('editor-replace', () => handler()),
      
    onEditorFormat: (handler: () => void) =>
      addEventListener('editor-format', () => handler()),
      
    onAIAssistantOpen: (handler: () => void) =>
      addEventListener('ai-assistant-open', () => handler()),
  };
}; 