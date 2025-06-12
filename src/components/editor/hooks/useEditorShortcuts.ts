import { useCallback } from 'react';
import { useShortcut } from '../../../hooks/useKeyboardShortcuts';

export interface UseEditorShortcutsProps {
  onSave: () => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onShowQuickOpen: () => void;
  onShowCommandPalette: () => void;
  onToggleSidebar: () => void;
  onShowGoToLine: () => void;
  onShowFind: () => void;
  onShowFindReplace: () => void;
  onShowGoToSymbol: () => void;
  onCloseCurrentTab: () => void;
  onReopenRecentTab: () => void;
  onNextTab: () => void;
  onPreviousTab: () => void;
  onSwitchToTab: (tabIndex: number) => void;
  onShowAIAssistant: () => void;
}

export const useEditorShortcuts = ({
  onSave,
  onNewFile,
  onOpenFile,
  onShowQuickOpen,
  onShowCommandPalette,
  onToggleSidebar,
  onShowGoToLine,
  onShowFind,
  onShowFindReplace,
  onShowGoToSymbol,
  onCloseCurrentTab,
  onReopenRecentTab,
  onNextTab,
  onPreviousTab,
  onSwitchToTab,
  onShowAIAssistant
}: UseEditorShortcutsProps) => {
  
  // File operations
  const handleSave = useCallback((e: any) => {
    console.log('⌨️ 🔍 Save shortcut triggered!', e);
    e.preventDefault();
    onSave();
  }, [onSave]);

  const createNewFile = useCallback((e: any) => {
    e.preventDefault();
    onNewFile();
  }, [onNewFile]);

  const handleOpenFile = useCallback((e: any) => {
    e.preventDefault();
    onOpenFile();
  }, [onOpenFile]);

  // Register shortcuts using the category/shortcutId API pattern from original CodeEditor
  useShortcut('fileManagement', 'saveFile', handleSave);
  useShortcut('fileManagement', 'newFile', createNewFile);
  useShortcut('fileManagement', 'openFile', handleOpenFile);

  useShortcut('navigation', 'quickOpen', useCallback((e: any) => {
    e.preventDefault();
    onShowQuickOpen();
  }, [onShowQuickOpen]));

  useShortcut('search', 'projectSearch', useCallback((e: any) => {
    e.preventDefault();
    onShowCommandPalette();
  }, [onShowCommandPalette]));

  useShortcut('views', 'toggleSidebar', useCallback((e: any) => {
    e.preventDefault();
    onToggleSidebar();
  }, [onToggleSidebar]));

  useShortcut('search', 'findInFile', useCallback((e: any) => {
    e.preventDefault();
    onShowFind();
  }, [onShowFind]));

  useShortcut('search', 'replaceInFile', useCallback((e: any) => {
    e.preventDefault();
    onShowFindReplace();
  }, [onShowFindReplace]));

  useShortcut('navigation', 'goToLine', useCallback((e: any) => {
    e.preventDefault();
    onShowGoToLine();
  }, [onShowGoToLine]));

  useShortcut('navigation', 'goToSymbol', useCallback((e: any) => {
    e.preventDefault();
    onShowGoToSymbol();
  }, [onShowGoToSymbol]));

  // Tab management
  useShortcut('tabManagement', 'closeTab', useCallback((e: any) => {
    e.preventDefault();
    onCloseCurrentTab();
  }, [onCloseCurrentTab]));

  useShortcut('tabManagement', 'reopenTab', useCallback((e: any) => {
    e.preventDefault();
    onReopenRecentTab();
  }, [onReopenRecentTab]));

  useShortcut('tabManagement', 'nextTab', useCallback((e: any) => {
    e.preventDefault();
    onNextTab();
  }, [onNextTab]));

  useShortcut('tabManagement', 'previousTab', useCallback((e: any) => {
    e.preventDefault();
    onPreviousTab();
  }, [onPreviousTab]));

  // Tab switching (1-9)
  for (let i = 1; i <= 9; i++) {
    useShortcut('tabManagement', `switchToTab${i}`, useCallback((e: any) => {
      e.preventDefault();
      onSwitchToTab(i - 1);
    }, [onSwitchToTab]));
  }

  // AI Assistant
  useShortcut('ai', 'askAI', useCallback((e: any) => {
    e.preventDefault();
    onShowAIAssistant();
  }, [onShowAIAssistant]));

  // Handle any additional global shortcuts that don't fit the useShortcut pattern
  // (if needed)
}; 