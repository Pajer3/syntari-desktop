// Syntari AI IDE - Professional Code Editor Component
// VSCode-inspired layout with high-performance virtualized file explorer

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import type { ProjectContext, FileInfo } from '../types';
import { VirtualizedFileExplorer } from './editor/VirtualizedFileExplorer';
import { EditorHeader } from './editor/EditorHeader';
import { EmptyEditorState } from './editor/EmptyEditorState';
import { EDITOR_OPTIONS } from '../constants/editorConfig';
import { getLanguageFromExtension } from '../utils/editorUtils';
import type { FileNode } from '../types/fileSystem';

// ================================
// TYPES
// ================================

interface CodeEditorProps {
  project: ProjectContext;
  onFileChange?: (file: FileInfo, content: string) => void;
  onRequestAI?: (context: string) => void;
}

interface EditorFile extends FileInfo {
  isOpen: boolean;
  isDirty: boolean;
  content: string;
}

interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PerformanceConfig {
  enableVirtualization: boolean;
  chunkSize: number;
  debounceMs: number;
  maxFileSize: number; // in bytes
  enableLinting: boolean;
  enableMinimap: boolean;
}

// ================================
// PERFORMANCE OPTIMIZED CODE EDITOR
// ================================

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
}) => {
  // Core state
  const [selectedFile, setSelectedFile] = useState<EditorFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Performance state
  const [performanceMode, setPerformanceMode] = useState(false);
  const [fileCache] = useState(new Map<string, string>());
  
  // Refs for optimization
  const editorRef = useRef<any>(null);
  const contentChangeTimeoutRef = useRef<number>();
  const autoSaveTimeoutRef = useRef<number>();
  
  // Performance configuration
  const perfConfig: PerformanceConfig = useMemo(() => ({
    enableVirtualization: true,
    chunkSize: performanceMode ? 25 : 50,
    debounceMs: performanceMode ? 100 : 300,
    maxFileSize: performanceMode ? 1024 * 1024 : 5 * 1024 * 1024, // 1MB vs 5MB
    enableLinting: !performanceMode,
    enableMinimap: !performanceMode,
  }), [performanceMode]);
  
  // Optimized file loading with caching and VS Code-style size guards
  const loadFileContent = useCallback(async (file: FileInfo) => {
    if (file.language === 'directory') {
      setError('Cannot open directory as file');
      return;
    }
    
    // Check cache first
    const cached = fileCache.get(file.path);
    if (cached) {
      setFileContent(cached);
      setIsModified(false);
      
      const cachedFile: EditorFile = {
        ...file,
        content: cached,
        isOpen: true,
        isDirty: false,
      };
      setSelectedFile(cachedFile);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use VS Code-style smart file reading
      const result = await invoke<{
        success: boolean;
        data?: {
          content?: string;
          size: number;
          is_binary: boolean;
          is_too_large: boolean;
          should_use_hex_mode: boolean;
          warning?: string;
        };
        error?: string;
      }>('read_file_smart', { path: file.path });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read file');
      }
      
      const fileData = result.data;
      
      // Handle VS Code-style size limits
      if (fileData.is_too_large) {
        setError(`File too large (${Math.round(fileData.size / 1024 / 1024)}MB). Maximum supported size is 256MB.`);
        return;
      }
      
      if (fileData.should_use_hex_mode) {
        setError(`Large file (${Math.round(fileData.size / 1024 / 1024)}MB). Opening in read-only mode for performance.`);
        // TODO: Implement hex/read-only viewer
        return;
      }
      
      if (fileData.is_binary) {
        setError('Cannot edit binary files. Consider using a hex editor.');
        return;
      }
      
      if (fileData.warning) {
        console.warn('⚠️ File size warning:', fileData.warning);
        // Show warning but continue
      }
      
      const content = fileData.content || '';
      
      // Cache the content
      fileCache.set(file.path, content);
      
      setFileContent(content);
      setIsModified(false);
      
      const updatedFile: EditorFile = {
        ...file,
        content,
        isOpen: true,
        isDirty: false,
      };
      setSelectedFile(updatedFile);
      
      // Show performance warning for large files
      if (fileData.size > 1024 * 1024) { // 1MB
        console.log(`📊 Large file loaded: ${Math.round(fileData.size / 1024)}KB`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [fileCache]);

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

  const handleFileSelect = useCallback((node: FileNode) => {
    if (selectedFile?.path === node.path) return;
    
    const fileInfo = convertFileNode(node);
    loadFileContent(fileInfo);
  }, [selectedFile, convertFileNode, loadFileContent]);
  
  // Stable file save handler
  const handleSave = useCallback(async () => {
    if (!selectedFile || !isModified) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<TauriResult<string>>('save_file', { 
        path: selectedFile.path, 
        content: fileContent 
      });
      
      if (result.success) {
        setIsModified(false);
        setSelectedFile(prev => prev ? { ...prev, isDirty: false } : null);
        
        // Update cache
        fileCache.set(selectedFile.path, fileContent);
        
        // Clear auto-save timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, isModified, fileContent, fileCache]);

  // Debounced content change handler
  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
    setIsModified(true);
    
    // Update cache immediately for responsiveness
    if (selectedFile) {
      fileCache.set(selectedFile.path, content);
    }
  }, [selectedFile, fileCache]);

  // Debounced content change handler with auto-save
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
    }, perfConfig.debounceMs);
    
    // Clear existing auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set auto-save timeout
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      handleSave();
    }, 5000);
    
  }, [selectedFile, onFileChange, fileContent, perfConfig.debounceMs, handleSave]);
  
  const handleAskAI = useCallback(() => {
    if (selectedFile && onRequestAI) {
      const context = `File: ${selectedFile.name}\nPath: ${selectedFile.path}\nLanguage: ${getLanguageFromExtension(selectedFile.extension)}\n\nContent:\n${fileContent}`;
      onRequestAI(context);
    }
  }, [selectedFile, fileContent, onRequestAI]);

  // Optimized editor mount handler
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure for performance
    const editorOptions = {
      ...EDITOR_OPTIONS,
      minimap: { enabled: perfConfig.enableMinimap },
      // Disable expensive features in performance mode
      folding: !performanceMode,
      bracketPairColorization: { enabled: !performanceMode },
      renderWhitespace: performanceMode ? 'none' : 'selection',
      smoothScrolling: !performanceMode,
    };
    
    editor.updateOptions(editorOptions);
    
    // VSCode-inspired professional theme (unchanged)
    monaco.editor.defineTheme('vscode-professional', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'constant', foreground: '4FC1FF' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2A2D2E',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorCursor.foreground': '#AEAFAD',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editor.selectionHighlightBackground': '#ADD6FF26',
        'editor.wordHighlightBackground': '#575757B8',
        'editor.findMatchBackground': '#515C6A',
        'editor.findMatchHighlightBackground': '#EA5C0055',
        'editorBracketMatch.background': '#0064001A',
        'editorBracketMatch.border': '#888888',
      }
    });
    
    monaco.editor.setTheme('vscode-professional');
    
    // Professional keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, handleAskAI);
    
    editor.focus();
  }, [perfConfig.enableMinimap, perfConfig.enableLinting, performanceMode, handleSave, handleAskAI]);
  
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
              setPerformanceMode(prev => !prev);
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleAskAI]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const language = selectedFile ? getLanguageFromExtension(selectedFile.extension) : 'plaintext';
  
  return (
    <div className={`flex h-full bg-vscode-bg text-vscode-fg font-mono ${performanceMode ? 'performance-mode' : ''}`}>
      {/* High-Performance File Explorer Sidebar */}
      <div className="w-64 flex-shrink-0 bg-vscode-sidebar border-r border-vscode-border">
        <VirtualizedFileExplorer
          rootPath={project.rootPath}
          selectedPath={selectedFile?.path}
          onFileSelect={handleFileSelect}
          height={window.innerHeight - 100} // Approximate height minus header
          className="h-full"
        />
      </div>
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Performance Mode Indicator */}
        {performanceMode && (
          <div className="h-6 px-3 bg-orange-600/20 border-b border-orange-600/30 text-orange-300 text-xs flex items-center">
            ⚡ Performance Mode Active - Some features disabled for better performance
            <button 
              onClick={() => setPerformanceMode(false)}
              className="ml-auto text-orange-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Editor Header/Tab Bar */}
        {selectedFile && (
          <div className="h-9 bg-vscode-tab-bg border-b border-vscode-border">
            <EditorHeader
              selectedFile={selectedFile}
              isModified={isModified}
              isLoading={isLoading}
              onSave={handleSave}
              onAskAI={handleAskAI}
            />
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="h-8 px-4 bg-vscode-error-bg border-b border-vscode-error-border text-vscode-error-fg text-xs flex items-center">
            <span className="mr-2">⚠</span>
            <span className="flex-1 truncate">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-vscode-error-fg hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Editor Content */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <div className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full bg-vscode-bg">
                  <div className="text-center text-vscode-fg-muted">
                    <div className="animate-spin w-6 h-6 border-2 border-vscode-accent border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Loading {selectedFile.name}...</p>
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={language}
                  value={fileContent}
                  onChange={(value) => handleContentChange(value || '')}
                  onMount={handleEditorDidMount}
                  theme="vscode-professional"
                  options={{
                    ...EDITOR_OPTIONS,
                    minimap: { enabled: perfConfig.enableMinimap },
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full bg-vscode-bg">
                      <div className="text-center text-vscode-fg-muted">
                        <div className="animate-pulse w-6 h-6 bg-vscode-accent rounded mx-auto mb-2"></div>
                        <p className="text-sm">Initializing editor...</p>
                      </div>
                    </div>
                  }
                />
              )}
            </div>
          ) : (
            <EmptyEditorState project={project} />
          )}
        </div>
      </div>
      
      {/* Performance Metrics (Debug) */}
      {performanceMode && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded border">
          <div>Cache: {fileCache.size} files</div>
          <div>Mode: Performance</div>
          <div>Chunk: {perfConfig.chunkSize}</div>
        </div>
      )}
    </div>
  );
}; 