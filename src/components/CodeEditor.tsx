// Syntari AI IDE - Refactored Code Editor Component
// Now much cleaner with extracted components and utilities

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
// MAIN CODE EDITOR COMPONENT
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
    // Don't try to load content for directories
    if (file.language === 'directory') {
      setError('Cannot open directory as file');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading file content for:', file.path);
      const result = await invoke<TauriResult<string>>('read_file', { path: file.path });
      
      if (result.success && result.data) {
        setFileContent(result.data);
        setIsModified(false);
        
        // Update the selected file with content
        const updatedFile: EditorFile = {
          ...file,
          content: result.data,
          isOpen: true,
          isDirty: false,
        };
        setSelectedFile(updatedFile);
        
        console.log('Successfully loaded file:', file.path, 'Size:', result.data.length);
      } else {
        throw new Error(result.error || 'Failed to read file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load file: ${errorMessage}`);
      console.error('Error loading file:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback((file: FileInfo) => {
    if (selectedFile?.path === file.path) {
      return; // Already selected
    }
    
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
      console.error('Error saving file:', err);
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
    
    // Define custom Syntari theme
    monaco.editor.defineTheme('syntari-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8B5CF6' },
        { token: 'string', foreground: '10B981' },
        { token: 'number', foreground: 'F59E0B' },
        { token: 'regexp', foreground: 'EF4444' },
        { token: 'type', foreground: '3B82F6' },
        { token: 'class', foreground: '06B6D4' },
        { token: 'function', foreground: 'F472B6' },
        { token: 'variable', foreground: 'E5E7EB' },
        { token: 'constant', foreground: 'FBBF24' },
      ],
      colors: {
        'editor.background': '#0F1419',
        'editor.foreground': '#E5E7EB',
        'editor.lineHighlightBackground': '#1F2937',
        'editor.selectionBackground': '#374151',
        'editor.inactiveSelectionBackground': '#1F2937',
        'editorCursor.foreground': '#3B82F6',
        'editorLineNumber.foreground': '#6B7280',
        'editorLineNumber.activeForeground': '#9CA3AF',
        'editor.selectionHighlightBackground': '#374151',
        'editor.wordHighlightBackground': '#374151',
        'editor.findMatchBackground': '#1E40AF',
        'editor.findMatchHighlightBackground': '#1E3A8A',
        'editorBracketMatch.background': '#374151',
        'editorBracketMatch.border': '#6B7280',
      }
    });
    
    // Set the custom theme
    monaco.editor.setTheme('syntari-dark');
    
    // Add custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      handleAskAI();
    });

    // Focus the editor
    editor.focus();
  }, [handleSave, handleAskAI]);
  
  // Keyboard shortcuts
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
    <div className="flex h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* File Explorer */}
      <div className="w-64 flex-shrink-0">
        <FileExplorer
          project={project}
          selectedFile={selectedFile?.path}
          onFileSelect={handleFileSelect}
        />
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        {selectedFile && (
          <EditorHeader
            selectedFile={selectedFile}
            isModified={isModified}
            isLoading={isLoading}
            onSave={handleSave}
            onAskAI={handleAskAI}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-gradient-to-r from-red-900/70 to-red-800/70 border-b border-red-700 text-red-200 text-sm backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <span className="text-red-400">⚠️</span>
              <span className="flex-1">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 transition-colors duration-200 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Editor Content */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <div className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⚡</div>
                    <p className="text-gray-400">Loading file...</p>
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={language}
                  value={fileContent}
                  onChange={(value) => handleContentChange(value || '')}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={EDITOR_OPTIONS}
                  loading={
                    <div className="flex items-center justify-center h-full bg-gray-900">
                      <div className="text-center">
                        <div className="animate-pulse text-4xl mb-4">🚀</div>
                        <p className="text-gray-400">Initializing Monaco Editor...</p>
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