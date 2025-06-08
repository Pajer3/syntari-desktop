// Syntari AI IDE - Monaco Editor AI Assistant
// Real-time AI-powered code assistance with intelligent suggestions

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { editor as monacoEditor } from 'monaco-editor';

interface AICodeSuggestion {
  id: string;
  type: 'completion' | 'refactor' | 'fix' | 'optimize' | 'explain';
  title: string;
  description: string;
  code?: string;
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  confidence: number; // 0-1
  provider: string;
  metadata?: {
    language?: string;
    context?: string;
    executionTime?: number;
  };
}

interface MonacoEditorAIAssistantProps {
  editor: monacoEditor.IStandaloneCodeEditor | null;
  language: string;
  onAIRequest?: (context: any) => Promise<AICodeSuggestion[]>;
  enabled?: boolean;
  realtimeAssistance?: boolean;
}

export const MonacoEditorAIAssistant: React.FC<MonacoEditorAIAssistantProps> = ({
  editor,
  language,
  onAIRequest,
  enabled = true,
  realtimeAssistance = true,
}) => {
  const [suggestions, setSuggestions] = useState<AICodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<number>();
  const lastRequestRef = useRef<string>('');

  // Get current context from editor
  const getCurrentContext = useCallback(() => {
    if (!editor) return null;

    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return null;

    const line = model.getLineContent(position.lineNumber);
    const linesBefore = model.getLinesContent().slice(Math.max(0, position.lineNumber - 5), position.lineNumber - 1);
    const linesAfter = model.getLinesContent().slice(position.lineNumber, Math.min(model.getLineCount(), position.lineNumber + 5));
    
    return {
      currentLine: line,
      lineNumber: position.lineNumber,
      column: position.column,
      linesBefore,
      linesAfter,
      selection: editor.getSelection() ? model.getValueInRange(editor.getSelection()!) : '',
      fullContent: model.getValue(),
      language,
      fileName: model.uri?.path || 'untitled'
    };
  }, [editor, language]);

  // Request AI suggestions
  const requestAISuggestions = useCallback(async (context: any) => {
    if (!onAIRequest || !enabled) return;

    const contextString = JSON.stringify(context);
    if (contextString === lastRequestRef.current) return;
    lastRequestRef.current = contextString;

    setIsLoading(true);
    try {
      const aiSuggestions = await onAIRequest(context);
      setSuggestions(aiSuggestions);
      setSelectedSuggestion(0);
      
      if (aiSuggestions.length > 0) {
        setShowSuggestions(true);
        updateSuggestionPosition();
      }
    } catch (error) {
      console.error('AI suggestion request failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onAIRequest, enabled]);

  // Update suggestion widget position
  const updateSuggestionPosition = useCallback(() => {
    if (!editor) return;

    const position = editor.getPosition();
    if (!position) return;

    const coord = editor.getScrolledVisiblePosition(position);
    if (coord) {
      const editorDom = editor.getDomNode();
      const rect = editorDom?.getBoundingClientRect();
      
      if (rect) {
        setCursorPosition({
          top: rect.top + coord.top + 20,
          left: rect.left + coord.left
        });
      }
    }
  }, [editor]);

  // Handle cursor changes with debouncing
  const handleCursorChange = useCallback(() => {
    if (!realtimeAssistance || !enabled) return;

    clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = window.setTimeout(() => {
      const context = getCurrentContext();
      if (context && context.currentLine.trim().length > 2) {
        requestAISuggestions({
          ...context,
          action: 'suggest',
          triggerReason: 'cursor_change'
        });
      }
    }, 1000); // 1 second debounce
  }, [realtimeAssistance, enabled, getCurrentContext, requestAISuggestions]);

  // Apply suggestion
  const applySuggestion = useCallback((suggestion: AICodeSuggestion) => {
    if (!editor || !suggestion.code) return;

    const model = editor.getModel();
    if (!model) return;

    const position = editor.getPosition();
    if (!position) return;

    let range = suggestion.range;
    if (!range) {
      // Default to current line
      range = {
        startLine: position.lineNumber,
        startColumn: 1,
        endLine: position.lineNumber,
        endColumn: model.getLineMaxColumn(position.lineNumber)
      };
    }

    // Apply the edit
    editor.executeEdits('ai-assistant', [{
      range: {
        startLineNumber: range.startLine,
        startColumn: range.startColumn,
        endLineNumber: range.endLine,
        endColumn: range.endColumn
      },
      text: suggestion.code
    }]);

    // Move cursor to end of inserted text
    const lines = suggestion.code.split('\n');
    const newPosition = {
      lineNumber: range.startLine + lines.length - 1,
      column: lines.length === 1 
        ? range.startColumn + suggestion.code.length 
        : lines[lines.length - 1].length + 1
    };
    editor.setPosition(newPosition);

    setShowSuggestions(false);
  }, [editor]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => Math.min(suggestions.length - 1, prev + 1));
        break;
      case 'Enter':
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedSuggestion, applySuggestion]);

  // Manual AI assistance (Ctrl+K)
  const handleManualAssistance = useCallback(async () => {
    const context = getCurrentContext();
    if (!context) return;

    await requestAISuggestions({
      ...context,
      action: 'assist',
      triggerReason: 'manual'
    });
  }, [getCurrentContext, requestAISuggestions]);

  // Setup editor listeners
  useEffect(() => {
    if (!editor || !enabled) return;

    const disposables: any[] = [];

    // Cursor position changes
    disposables.push(
      editor.onDidChangeCursorPosition(handleCursorChange)
    );

    // Selection changes
    disposables.push(
      editor.onDidChangeCursorSelection(() => {
        setShowSuggestions(false);
      })
    );

    // Content changes
    disposables.push(
      editor.onDidChangeModelContent(() => {
        setShowSuggestions(false);
      })
    );

    // Monaco editor commands handled via global keyboard listener
    // to avoid namespace dependency issues

    return () => {
      disposables.forEach(d => d?.dispose?.());
    };
  }, [editor, enabled, handleCursorChange, handleManualAssistance]);

  // Global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  if (!enabled || !showSuggestions || suggestions.length === 0 || !cursorPosition) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className="fixed z-50 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl backdrop-blur-sm"
      style={{
        top: cursorPosition.top,
        left: cursorPosition.left,
        maxWidth: '400px',
        maxHeight: '300px'
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-vscode-border bg-vscode-sidebar/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-vscode-fg">🤖 AI Assistant</span>
          {isLoading && (
            <div className="w-3 h-3 border border-vscode-accent border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="max-h-48 overflow-y-auto ide-scrollbar">
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              index === selectedSuggestion
                ? 'bg-vscode-list-hover border-l-2 border-vscode-accent'
                : 'hover:bg-vscode-list-hover/50'
            }`}
            onClick={() => applySuggestion(suggestion)}
          >
            <div className="flex items-start space-x-2">
              {/* Type Icon */}
              <div className="text-sm mt-0.5">
                {suggestion.type === 'completion' && '💡'}
                {suggestion.type === 'refactor' && '🔧'}
                {suggestion.type === 'fix' && '🩹'}
                {suggestion.type === 'optimize' && '⚡'}
                {suggestion.type === 'explain' && '📖'}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-vscode-fg truncate">
                  {suggestion.title}
                </div>
                <div className="text-xs text-vscode-fg-muted mt-1">
                  {suggestion.description}
                </div>
                
                {/* Code Preview */}
                {suggestion.code && suggestion.code.length < 100 && (
                  <div className="mt-2 p-2 bg-vscode-editor rounded text-xs font-mono text-vscode-fg border border-vscode-border">
                    {suggestion.code}
                  </div>
                )}
                
                {/* Metadata */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2 text-xs text-vscode-fg-muted">
                    <span>{suggestion.provider}</span>
                    <span>•</span>
                    <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
                  </div>
                  
                  {index === selectedSuggestion && (
                    <div className="text-xs text-vscode-accent">
                      Press Enter to apply
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-vscode-border bg-vscode-sidebar/30">
        <div className="text-xs text-vscode-fg-muted">
          <div className="flex items-center justify-between">
            <span>↑↓ Navigate • Enter Apply • Esc Close</span>
            <span>Ctrl+K for manual assistance</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Assistant Hook for Monaco Editor
export const useMonacoAIAssistant = (
  editor: monacoEditor.IStandaloneCodeEditor | null,
  language: string,
  onAIRequest?: (context: any) => Promise<AICodeSuggestion[]>
) => {
  const [enabled, setEnabled] = useState(true);
  const [realtimeAssistance, setRealtimeAssistance] = useState(true);

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  const toggleRealtimeAssistance = useCallback(() => {
    setRealtimeAssistance(prev => !prev);
  }, []);

  return {
    enabled,
    realtimeAssistance,
    toggleEnabled,
    toggleRealtimeAssistance,
    AIAssistantComponent: React.memo(() => (
      <MonacoEditorAIAssistant
        editor={editor}
        language={language}
        onAIRequest={onAIRequest}
        enabled={enabled}
        realtimeAssistance={realtimeAssistance}
      />
    ))
  };
}; 