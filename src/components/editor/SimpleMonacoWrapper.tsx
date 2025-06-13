// Simple Monaco Editor Wrapper - Minimal implementation to avoid getFullModelRange errors
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
// import { EditorFile } from '../../types/editor'; // Commented out since this import is missing
import { useResizeObserver } from '../ui/hooks/useResizeObserver';

// Local interface to replace missing EditorFile type
interface EditorFile {
  path: string;
  name: string;
  content?: string;
}

interface SimpleMonacoWrapperProps {
  selectedFile: EditorFile | null;
  fileContent: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  fontSize?: number;
  readOnly?: boolean;
}

export const SimpleMonacoWrapper: React.FC<SimpleMonacoWrapperProps> = ({
  selectedFile,
  fileContent,
  onContentChange,
  onSave,
  fontSize = 14,
  readOnly = false
}) => {
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ultra minimal editor options
  const editorOptions = {
    fontSize,
    fontFamily: 'JetBrains Mono, monospace',
    readOnly,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    
    // Disable ALL potentially problematic features
    minimap: { enabled: false },
    folding: false,
    codeLens: false,
    hover: { enabled: false },
    occurrencesHighlight: 'off' as const,
    selectionHighlight: false,
    bracketPairColorization: { enabled: false },
    guides: { indentation: false, bracketPairs: false },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    links: false,
    colorDecorators: false,
    renderLineHighlight: 'none' as const,
    matchBrackets: 'never' as const,
    formatOnPaste: false,
    formatOnType: false,
    contextmenu: false,
    
    // Basic settings only
    lineNumbers: 'on' as const,
    wordWrap: 'off' as const,
    theme: 'vs-dark',
  };

  // Simple content change handler
  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onContentChange(value);
    }
  }, [onContentChange]);

  // Simple mount handler
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Reduce logging frequency to prevent console spam
    // console.log('🚀 Simple Monaco mounted');
    
    // Simple validation without extensive logging
    if (editor && editor.getModel) {
      // console.log('✅ Simple Monaco ready');
      setIsReady(true);
    }
  }, []);

  // Get language from file extension
  const getLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': return 'javascript';
      case 'py': return 'python';
      case 'rs': return 'rust';
      case 'go': return 'go';
      case 'java': return 'java';
      case 'cpp': case 'cc': case 'cxx': return 'cpp';
      case 'c': return 'c';
      case 'cs': return 'csharp';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'swift': return 'swift';
      case 'kt': return 'kotlin';
      case 'dart': return 'dart';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'json': return 'json';
      case 'xml': return 'xml';
      case 'yaml': case 'yml': return 'yaml';
      case 'md': return 'markdown';
      case 'sql': return 'sql';
      case 'sh': case 'bash': return 'shell';
      default: return 'plaintext';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-vscode-editor">
        <div className="text-center p-6">
          <div className="text-red-400 mb-4">⚠️ Editor Error</div>
          <div className="text-vscode-fg-muted text-sm mb-4">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-vscode-accent text-white rounded hover:bg-vscode-accent/80"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full bg-vscode-editor">
        <div className="text-center text-vscode-fg-muted">
          No file selected
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Editor
        height="100%"
        language={getLanguage(selectedFile.name)}
        value={fileContent}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={editorOptions}
        theme="vs-dark"
        loading={
          <div className="flex items-center justify-center h-full bg-vscode-editor">
            <div className="text-vscode-fg-muted">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
}; 