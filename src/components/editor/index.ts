// Syntari AI IDE - Editor Components
// Centralized exports for all editor-related components

export { CodeEditor } from './CodeEditor';
export { EditorHeader } from './EditorHeader';
export { EditorLayout } from './EditorLayout';
export { FileExplorer } from './FileExplorer';
export { FileTabBar } from './FileTabBar';
export { MonacoEditorWrapper } from './MonacoEditorWrapper';
export { UnsavedChangesDialog } from './UnsavedChangesDialog';
export { GoToLineDialog } from './GoToLineDialog';
export { FileExplorerViewer } from './FileExplorerViewer';

// Search components
export { SearchPanel } from './search/SearchPanel';
export { SearchProvider } from './search/SearchProvider';

// Hooks
export { useEditorState } from './hooks/useEditorState';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { useFileSearch } from './hooks/useFileSearch';

// Enhanced Tab Management
export { TabLayout, useTabManager, type Tab, type SplitView } from '../TabLayout';
export { FileTabManager } from './FileTabManager';

// Advanced Editor Features
export { PerformanceMetrics } from './PerformanceMetrics';
export { ErrorNotification } from './ErrorNotification';
export { EmptyEditorState } from './EmptyEditorState';

// Search Components
export { SearchResults } from './search/SearchResults';
export { SearchResult } from './search/SearchResult';
export { useProjectSearch } from './search/useProjectSearch'; 