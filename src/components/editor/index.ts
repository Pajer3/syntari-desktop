// Editor Components and Hooks - Clean exports
// Refactored from CodeEditor.tsx for better maintainability

// Hooks
export { useFileCache, type EditorFile } from './useFileCache';
export { useFileLoader } from './useFileLoader';
export { useFileSave } from './useFileSave';
export { usePerformanceConfig, type PerformanceConfig } from './usePerformanceConfig';

// Components
export { PerformanceModeIndicator } from './PerformanceModeIndicator';
export { PerformanceMetrics } from './PerformanceMetrics';
export { ErrorNotification } from './ErrorNotification';
export { MonacoEditorWrapper } from './MonacoEditorWrapper';

// Existing components
export { VirtualizedFileExplorer } from './VirtualizedFileExplorer';
export { EditorHeader } from './EditorHeader';
export { EmptyEditorState } from './EmptyEditorState'; 