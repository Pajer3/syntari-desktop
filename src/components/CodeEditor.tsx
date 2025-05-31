// Syntari AI IDE - Professional Code Editor Component
// VSCode-inspired layout and design

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import type { ProjectContext, FileInfo } from '../types';
import { FileExplorer } from './editor/FileExplorer';
import { EditorHeader } from './editor/EditorHeader';
import { EmptyEditorState } from './editor/EmptyEditorState';
import { EDITOR_OPTIONS } from '../constants/editorConfig';
import { getLanguageFromExtension } from '../utils/editorUtils';

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

// ================================
// PROFESSIONAL CODE EDITOR COMPONENT
// ================================

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
}) => {
  const [selectedFile, setSelectedFile] = useState<EditorFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  
  const loadFileContent = useCallback(async (file: FileInfo) => {
    if (file.language === 'directory') {
      setError('Cannot open directory as file');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<TauriResult<string>>('read_file', { path: file.path });
      
      if (result.success && result.data) {
        setFileContent(result.data);
        setIsModified(false);
        
        const updatedFile: EditorFile = {
          ...file,
          content: result.data,
          isOpen: true,
          isDirty: false,
        };
        setSelectedFile(updatedFile);
      } else {
        throw new Error(result.error || 'Failed to read file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback((file: FileInfo) => {
    if (selectedFile?.path === file.path) return;
    loadFileContent(file);
  }, [selectedFile, loadFileContent]);
  
  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
    setIsModified(true);
    
    if (selectedFile && onFileChange) {
      onFileChange(selectedFile, content);
    }
  }, [selectedFile, onFileChange]);
  
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
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, isModified, fileContent]);
  
  const handleAskAI = useCallback(() => {
    if (selectedFile && onRequestAI) {
      const context = `File: ${selectedFile.name}\nPath: ${selectedFile.path}\nLanguage: ${getLanguageFromExtension(selectedFile.extension)}\n\nContent:\n${fileContent}`;
      onRequestAI(context);
    }
  }, [selectedFile, fileContent, onRequestAI]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // VSCode-inspired professional theme
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
  }, [handleSave, handleAskAI]);
  
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
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleAskAI]);

  const language = selectedFile ? getLanguageFromExtension(selectedFile.extension) : 'plaintext';
  
  return (
    <div className="flex h-full bg-vscode-bg text-vscode-fg font-mono">
      {/* File Explorer Sidebar */}
      <div className="w-64 flex-shrink-0 bg-vscode-sidebar border-r border-vscode-border">
        <FileExplorer
          project={project}
          selectedFile={selectedFile?.path}
          onFileSelect={handleFileSelect}
        />
      </div>
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
                  options={EDITOR_OPTIONS}
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
    </div>
  );
}; 