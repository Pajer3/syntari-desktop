// Syntari AI IDE - Monaco AI Assistant Hook
// Manages AI assistance state and integration with Monaco Editor

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

interface AIAssistantState {
  enabled: boolean;
  realtimeAssistance: boolean;
  suggestions: AICodeSuggestion[];
  isLoading: boolean;
  currentSuggestion: number;
  showWidget: boolean;
  lastContext: string;
}

interface UseMonacoAIAssistantReturn {
  enabled: boolean;
  realtimeAssistance: boolean;
  suggestions: AICodeSuggestion[];
  isLoading: boolean;
  showWidget: boolean;
  toggleEnabled: () => void;
  toggleRealtimeAssistance: () => void;
  requestSuggestions: (context?: string) => Promise<void>;
  applySuggestion: (suggestionId: string) => void;
  dismissSuggestions: () => void;
  AIAssistantComponent: React.FC;
}

export const useMonacoAIAssistant = (
  editor: monacoEditor.IStandaloneCodeEditor | null,
  language: string,
  onAIRequest?: (context: any) => Promise<AICodeSuggestion[]>
): UseMonacoAIAssistantReturn => {
  const [state, setState] = useState<AIAssistantState>({
    enabled: true,
    realtimeAssistance: true,
    suggestions: [],
    isLoading: false,
    currentSuggestion: 0,
    showWidget: false,
    lastContext: ''
  });

  const debounceTimeoutRef = useRef<number>();
  const lastPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);

  // Toggle AI assistance
  const toggleEnabled = useCallback(() => {
    setState(prev => ({ ...prev, enabled: !prev.enabled, showWidget: false }));
  }, []);

  // Toggle realtime assistance
  const toggleRealtimeAssistance = useCallback(() => {
    setState(prev => ({ ...prev, realtimeAssistance: !prev.realtimeAssistance }));
  }, []);

  // Get current context from editor
  const getCurrentContext = useCallback(() => {
    if (!editor) return null;

    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return null;

    const currentLine = model.getLineContent(position.lineNumber);
    const currentWord = model.getWordAtPosition(position);
    const selection = editor.getSelection();
    
    // Get surrounding context (5 lines before and after)
    const startLine = Math.max(1, position.lineNumber - 5);
    const endLine = Math.min(model.getLineCount(), position.lineNumber + 5);
    const surroundingText = model.getValueInRange({
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine)
    });

    return {
      language,
      currentLine,
      currentWord: currentWord?.word || '',
      position,
      selection: selection ? model.getValueInRange(selection) : '',
      surroundingText,
      fullContent: model.getValue(),
      fileName: model.uri?.path || 'untitled'
    };
  }, [editor, language]);

  // Request AI suggestions
  const requestSuggestions = useCallback(async (manualContext?: string) => {
    if (!state.enabled || !onAIRequest) return;

    const context = manualContext || getCurrentContext();
    if (!context) return;

    setState(prev => ({ ...prev, isLoading: true, showWidget: true }));

    try {
      const suggestions = await onAIRequest(context);
      setState(prev => ({
        ...prev,
        suggestions,
        isLoading: false,
        currentSuggestion: 0,
        lastContext: JSON.stringify(context)
      }));
    } catch (error) {
      console.error('AI suggestion request failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        suggestions: [],
        showWidget: false
      }));
    }
  }, [state.enabled, onAIRequest, getCurrentContext]);

  // Apply a suggestion
  const applySuggestion = useCallback((suggestionId: string) => {
    if (!editor) return;

    const suggestion = state.suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !suggestion.code) return;

    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return;

    // Apply the suggestion
    if (suggestion.range) {
      // Replace specific range
      editor.executeEdits('ai-assistant', [{
        range: {
          startLineNumber: suggestion.range.startLine,
          startColumn: suggestion.range.startColumn,
          endLineNumber: suggestion.range.endLine,
          endColumn: suggestion.range.endColumn
        },
        text: suggestion.code
      }]);
    } else {
      // Insert at current position
      editor.executeEdits('ai-assistant', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: suggestion.code
      }]);
    }

    // Hide suggestions
    setState(prev => ({ ...prev, showWidget: false, suggestions: [] }));
  }, [editor, state.suggestions]);

  // Dismiss suggestions
  const dismissSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, showWidget: false, suggestions: [] }));
  }, []);

  // Handle cursor position changes for realtime assistance
  useEffect(() => {
    if (!editor || !state.enabled || !state.realtimeAssistance) return;

    const handleCursorChange = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = window.setTimeout(() => {
        const position = editor.getPosition();
        if (!position) return;

        // Only trigger if position actually changed significantly
        const lastPos = lastPositionRef.current;
        if (lastPos && 
            Math.abs(lastPos.lineNumber - position.lineNumber) < 2 &&
            Math.abs(lastPos.column - position.column) < 10) {
          return;
        }

        lastPositionRef.current = position;
        requestSuggestions();
      }, 1000); // Debounce for 1 second
    };

    const disposable = editor.onDidChangeCursorPosition(handleCursorChange);
    return () => {
      disposable.dispose();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [editor, state.enabled, state.realtimeAssistance, requestSuggestions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.showWidget) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          dismissSuggestions();
          break;
        case 'Enter':
          e.preventDefault();
          if (state.suggestions[state.currentSuggestion]) {
            applySuggestion(state.suggestions[state.currentSuggestion].id);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            currentSuggestion: Math.max(0, prev.currentSuggestion - 1)
          }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            currentSuggestion: Math.min(prev.suggestions.length - 1, prev.currentSuggestion + 1)
          }));
          break;
      }
    };

    const editorDom = editor.getDomNode();
    if (editorDom) {
      editorDom.addEventListener('keydown', handleKeyDown);
      return () => editorDom.removeEventListener('keydown', handleKeyDown);
    }
  }, [editor, state.showWidget, state.currentSuggestion, state.suggestions, applySuggestion, dismissSuggestions]);

  // AI Assistant Widget Component
  const AIAssistantComponent: React.FC = useMemo(() => {
    return () => {
      if (!state.showWidget || state.suggestions.length === 0) return null;

      return (
        <div className="fixed top-20 right-4 w-80 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-vscode-tab-inactive border-b border-vscode-border">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-vscode-fg">🤖 AI Suggestions</span>
              {state.isLoading && (
                <div className="w-4 h-4 border-2 border-vscode-accent border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <button
              onClick={dismissSuggestions}
              className="text-vscode-fg-muted hover:text-vscode-fg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Suggestions */}
          <div className="max-h-80 overflow-y-auto ide-scrollbar">
            {state.isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-vscode-border rounded mb-2"></div>
                  <div className="h-4 bg-vscode-border rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-vscode-border rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              state.suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`p-3 border-b border-vscode-border cursor-pointer transition-colors ${
                    index === state.currentSuggestion
                      ? 'bg-vscode-list-active text-vscode-list-active-fg'
                      : 'hover:bg-vscode-list-hover'
                  }`}
                  onClick={() => applySuggestion(suggestion.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-vscode-fg">{suggestion.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        suggestion.type === 'fix' ? 'bg-red-500/20 text-red-400' :
                        suggestion.type === 'optimize' ? 'bg-yellow-500/20 text-yellow-400' :
                        suggestion.type === 'refactor' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {suggestion.type}
                      </span>
                      <span className="text-xs text-vscode-fg-muted">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-vscode-fg-muted mb-2">{suggestion.description}</p>
                  {suggestion.code && (
                    <pre className="text-xs bg-vscode-editor p-2 rounded border overflow-x-auto">
                      <code>{suggestion.code.slice(0, 100)}{suggestion.code.length > 100 ? '...' : ''}</code>
                    </pre>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-vscode-fg-muted">
                    <span>via {suggestion.provider}</span>
                    {suggestion.metadata?.executionTime && (
                      <span>{suggestion.metadata.executionTime}ms</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-vscode-tab-inactive border-t border-vscode-border text-xs text-vscode-fg-muted">
            <div className="flex justify-between items-center">
              <span>Press Enter to apply, Esc to dismiss</span>
              <span>{state.currentSuggestion + 1} of {state.suggestions.length}</span>
            </div>
          </div>
        </div>
      );
    };
  }, [state, applySuggestion, dismissSuggestions]);

  return {
    enabled: state.enabled,
    realtimeAssistance: state.realtimeAssistance,
    suggestions: state.suggestions,
    isLoading: state.isLoading,
    showWidget: state.showWidget,
    toggleEnabled,
    toggleRealtimeAssistance,
    requestSuggestions,
    applySuggestion,
    dismissSuggestions,
    AIAssistantComponent
  };
}; 