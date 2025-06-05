// Syntari AI IDE - Monaco Editor Wrapper Component
// Extracted from CodeEditor.tsx for better maintainability

import React, { useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { EDITOR_OPTIONS } from '../../constants/editorConfig';
import { getLanguageFromExtension } from '../../utils/editorUtils';
import type { PerformanceConfig } from './usePerformanceConfig';
import type { EditorFile } from './useFileCache';

interface MonacoEditorWrapperProps {
  selectedFile: EditorFile | null;
  fileContent: string;
  perfConfig: PerformanceConfig;
  performanceMode: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onAskAI: () => void;
  isLoading?: boolean;
  goToLineRef?: React.MutableRefObject<((lineNumber: number, column?: number) => void) | null>;
  getCurrentLineRef?: React.MutableRefObject<(() => number) | null>;
  getTotalLinesRef?: React.MutableRefObject<(() => number) | null>;
  openFindRef?: React.MutableRefObject<(() => void) | null>;
  openFindReplaceRef?: React.MutableRefObject<(() => void) | null>;
  goToSymbolRef?: React.MutableRefObject<(() => void) | null>;
}

export const MonacoEditorWrapper: React.FC<MonacoEditorWrapperProps> = ({
  selectedFile,
  fileContent,
  perfConfig,
  performanceMode,
  onContentChange,
  onSave,
  onAskAI,
  isLoading = false,
  goToLineRef,
  getCurrentLineRef,
  getTotalLinesRef,
  openFindRef,
  openFindReplaceRef,
  goToSymbolRef,
}) => {
  const editorRef = useRef<any>(null);

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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, onAskAI);
    
    // Add Go to Line shortcut for testing (Ctrl+G)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
      console.log('Go to Line shortcut triggered from Monaco editor');
    });
    
    // Add Find in File shortcut (Ctrl+F) - Monaco's built-in
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction('actions.find').run();
    });
    
    // Add Find and Replace shortcut (Ctrl+H) - Monaco's built-in
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      editor.getAction('editor.action.startFindReplaceAction').run();
    });
    
    // Add Go to Symbol shortcut (Ctrl+Shift+O) - Monaco's built-in
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO, () => {
      editor.getAction('editor.action.quickOutline').run();
    });
    
    // Multi-cursor and selection shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      editor.getAction('editor.action.selectHighlights').run();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.insertCursorAbove').run();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.insertCursorBelow').run();
    });
    
    // Line manipulation shortcuts
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.moveLinesUpAction').run();
    });
    
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.moveLinesDownAction').run();
    });
    
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.copyLinesUpAction').run();
    });
    
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.copyLinesDownAction').run();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
      editor.getAction('editor.action.deleteLines').run();
    });
    
    // Commenting shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction('editor.action.commentLine').run();
    });
    
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyA, () => {
      editor.getAction('editor.action.blockComment').run();
    });
    
    editor.focus();
  }, [perfConfig.enableMinimap, performanceMode, onSave, onAskAI]);

  // Go to line handler
  const handleGoToLine = useCallback((lineNumber: number, column?: number) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      // Set cursor position
      const position = { lineNumber, column: column || 1 };
      editor.setPosition(position);
      // Reveal the line in the center of the editor
      editor.revealLineInCenter(lineNumber);
      // Focus the editor
      editor.focus();
    }
  }, []);

  // Open find widget handler
  const handleOpenFind = useCallback(() => {
    if (editorRef.current) {
      // Trigger Monaco's built-in find action
      editorRef.current.getAction('actions.find').run();
    }
  }, []);

  // Open find and replace widget handler
  const handleOpenFindReplace = useCallback(() => {
    if (editorRef.current) {
      // Trigger Monaco's built-in find and replace action
      editorRef.current.getAction('editor.action.startFindReplaceAction').run();
    }
  }, []);

  // Open Go to Symbol in File handler
  const handleGoToSymbol = useCallback(() => {
    if (editorRef.current) {
      // Trigger Monaco's built-in Go to Symbol action
      editorRef.current.getAction('editor.action.quickOutline').run();
    }
  }, []);

  // Get current line number
  const getCurrentLine = useCallback(() => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      return position ? position.lineNumber : 1;
    }
    return 1;
  }, []);

  // Get total line count
  const getTotalLines = useCallback(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      return model ? model.getLineCount() : 1;
    }
    return 1;
  }, []);

  // Expose the goToLine method to parent component
  React.useEffect(() => {
    if (goToLineRef) {
      goToLineRef.current = handleGoToLine;
    }
    if (getCurrentLineRef) {
      getCurrentLineRef.current = getCurrentLine;
    }
    if (getTotalLinesRef) {
      getTotalLinesRef.current = getTotalLines;
    }
    if (openFindRef) {
      openFindRef.current = handleOpenFind;
    }
    if (openFindReplaceRef) {
      openFindReplaceRef.current = handleOpenFindReplace;
    }
    if (goToSymbolRef) {
      goToSymbolRef.current = handleGoToSymbol;
    }
  }, [handleGoToLine, getCurrentLine, getTotalLines, handleOpenFind, handleOpenFindReplace, goToLineRef, getCurrentLineRef, getTotalLinesRef, openFindRef, openFindReplaceRef, handleGoToSymbol, goToSymbolRef]);

  if (!selectedFile) {
    return null;
  }

  const language = getLanguageFromExtension(selectedFile.extension);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-vscode-bg">
        <div className="text-center text-vscode-fg-muted">
          <div className="animate-spin w-6 h-6 border-2 border-vscode-accent border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm">Loading {selectedFile.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={fileContent}
      onChange={(value) => onContentChange(value || '')}
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
  );
}; 