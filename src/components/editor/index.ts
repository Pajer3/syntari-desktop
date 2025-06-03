// Syntari AI IDE - Enhanced Editor Components Index
// Clean exports for enhanced tab management and editor system

// Enhanced Tab Management
export { TabLayout, useTabManager, type Tab, type SplitView } from '../TabLayout';
export { UnsavedChangesDialog } from './UnsavedChangesDialog';
export { FileTabManager } from './FileTabManager';

// Core Editor Hooks
export { useFileCache, type EditorFile } from './useFileCache';
export { useFileLoader } from './useFileLoader';
export { useFileSave } from './useFileSave';
export { usePerformanceConfig, type PerformanceConfig } from './usePerformanceConfig';

// Core Editor Components
export { PerformanceModeIndicator } from './PerformanceModeIndicator';
export { PerformanceMetrics } from './PerformanceMetrics';
export { ErrorNotification } from './ErrorNotification';
export { MonacoEditorWrapper } from './MonacoEditorWrapper';
export { VirtualizedFileExplorer } from './VirtualizedFileExplorer';
export { EditorHeader } from './EditorHeader';
export { EmptyEditorState } from './EmptyEditorState';

// Search Components
export { SearchPanel } from './search/SearchPanel';
export { SearchInput } from './search/SearchInput';
export { SearchResults } from './search/SearchResults';
export { SearchResult } from './search/SearchResult';
export { useProjectSearch } from './search/useProjectSearch'; 