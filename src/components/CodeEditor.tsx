// Syntari AI IDE - Refactored Code Editor Component
// Clean, focused main component leveraging extracted hooks and components

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ProjectContext, FileInfo } from '../types';
import type { FileNode } from '../types/fileSystem';
import {
  useFileCache,
  useFileLoader,
  useFileSave,
  usePerformanceConfig,
  VirtualizedFileExplorer,
  EditorHeader,
  EmptyEditorState,
  PerformanceModeIndicator,
  PerformanceMetrics,
  ErrorNotification,
  MonacoEditorWrapper,
  type EditorFile,
} from './editor';

// ================================
// TYPES
// ================================

interface CodeEditorProps {
  project: ProjectContext;
  onFileChange?: (file: FileInfo, content: string) => void;
  onRequestAI?: (context: string) => void;
}

// ================================
// REFACTORED CODE EDITOR
// ================================

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
}) => {
  // Core state
  const [selectedFile, setSelectedFile] = useState<EditorFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isModified, setIsModified] = useState(false);
  
  // Custom hooks for focused functionality
  const fileCache = useFileCache();
  const fileLoader = useFileLoader();
  const fileSaver = useFileSave();
  const performanceConfig = usePerformanceConfig();
  
  // Refs for optimization
  const contentChangeTimeoutRef = useRef<number>();
  
  // Convert FileNode to FileInfo for compatibility
  const convertFileNode = useCallback((node: FileNode): FileInfo => ({
    path: node.path,
    name: node.name,
    extension: node.extension,
    size: node.size || 0,
    lastModified: node.lastModified,
    content: undefined,
    language: node.isDirectory ? 'directory' : undefined,
  }), []);

  // File selection handler
  const handleFileSelect = useCallback(async (node: FileNode) => {
    if (selectedFile?.path === node.path) return;
    
    const fileInfo = convertFileNode(node);
    const loadedFile = await fileLoader.loadFileContent(
      fileInfo,
      fileCache.getCachedContent,
      fileCache.setCachedContent
    );
    
    if (loadedFile) {
      setSelectedFile(loadedFile);
      setFileContent(loadedFile.content);
      setIsModified(false);
    }
  }, [selectedFile, convertFileNode, fileLoader, fileCache]);
  
  // File save handler
  const handleSave = useCallback(async () => {
    if (!selectedFile || !isModified) return;
    
    const success = await fileSaver.saveFile(
      selectedFile,
      fileContent,
      fileCache.setCachedContent
    );
    
    if (success) {
      setIsModified(false);
      setSelectedFile(prev => prev ? { ...prev, isDirty: false } : null);
    }
  }, [selectedFile, isModified, fileContent, fileSaver, fileCache]);

  // Content change handler with debouncing
  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
    setIsModified(true);
    
    // Update cache immediately for responsiveness
    if (selectedFile) {
      fileCache.setCachedContent(selectedFile.path, content);
    }
  }, [selectedFile, fileCache]);

  // Auto-save and change notification effect
  useEffect(() => {
    if (!selectedFile || !isModified) return;
    
    // Clear existing timeout
    if (contentChangeTimeoutRef.current) {
      clearTimeout(contentChangeTimeoutRef.current);
    }
    
    // Debounce content changes
    contentChangeTimeoutRef.current = window.setTimeout(() => {
      if (onFileChange && selectedFile) {
        onFileChange(selectedFile, fileContent);
      }
    }, performanceConfig.perfConfig.debounceMs);
    
    // Schedule auto-save
    fileSaver.scheduleAutoSave(
      selectedFile,
      fileContent,
      fileCache.setCachedContent
    );
    
    return () => {
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, [selectedFile, onFileChange, fileContent, performanceConfig.perfConfig.debounceMs, fileSaver, fileCache]);
  
  // AI assistance handler
  const handleAskAI = useCallback(() => {
    if (selectedFile && onRequestAI) {
      const context = `File: ${selectedFile.name}\nPath: ${selectedFile.path}\nContent:\n${fileContent}`;
      onRequestAI(context);
    }
  }, [selectedFile, fileContent, onRequestAI]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'k':
            e.preventDefault();
            handleAskAI();
            break;
          case 'p':
            if (e.shiftKey) {
              e.preventDefault();
              performanceConfig.togglePerformanceMode();
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleAskAI, performanceConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fileSaver.cancelAutoSave();
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, [fileSaver]);

  // Combined error handling
  const currentError = fileLoader.error || fileSaver.saveError;
  const handleDismissError = useCallback(() => {
    fileLoader.clearError();
    fileSaver.clearSaveError();
  }, [fileLoader, fileSaver]);

  return (
    <div className={`flex h-full bg-vscode-bg text-vscode-fg font-mono ${performanceConfig.performanceMode ? 'performance-mode' : ''}`}>
      {/* High-Performance File Explorer Sidebar */}
      <div className="w-64 flex-shrink-0 bg-vscode-sidebar border-r border-vscode-border">
        <VirtualizedFileExplorer
          rootPath={project.rootPath}
          selectedPath={selectedFile?.path}
          onFileSelect={handleFileSelect}
          height={window.innerHeight - 100}
          className="h-full"
        />
      </div>
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Performance Mode Indicator */}
        <PerformanceModeIndicator
          isActive={performanceConfig.performanceMode}
          onDisable={() => performanceConfig.setPerformanceMode(false)}
        />
        
        {/* Editor Header/Tab Bar */}
        {selectedFile && (
          <div className="h-9 bg-vscode-tab-bg border-b border-vscode-border">
            <EditorHeader
              selectedFile={selectedFile}
              isModified={isModified}
              isLoading={fileSaver.isSaving}
              onSave={handleSave}
              onAskAI={handleAskAI}
            />
          </div>
        )}

        {/* Error Notification */}
        <ErrorNotification
          error={currentError}
          onDismiss={handleDismissError}
        />
        
        {/* Editor Content */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <MonacoEditorWrapper
              selectedFile={selectedFile}
              fileContent={fileContent}
              perfConfig={performanceConfig.perfConfig}
              performanceMode={performanceConfig.performanceMode}
              onContentChange={handleContentChange}
              onSave={handleSave}
              onAskAI={handleAskAI}
              isLoading={fileLoader.isLoading}
            />
          ) : (
            <EmptyEditorState project={project} />
          )}
        </div>
      </div>
      
      {/* Performance Metrics (Debug) */}
      <PerformanceMetrics
        isVisible={performanceConfig.performanceMode}
        cacheSize={fileCache.getCacheSize()}
        perfConfig={performanceConfig.perfConfig}
      />
    </div>
  );
}; 