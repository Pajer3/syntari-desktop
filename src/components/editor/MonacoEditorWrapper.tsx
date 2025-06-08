// Syntari AI IDE - Monaco Editor Wrapper Component
// Enhanced for better performance and smoother UI experience

import { useCallback, useRef, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import Editor from '@monaco-editor/react';
import { EDITOR_OPTIONS } from '../../constants/editorConfig';
import { getLanguageFromExtension } from '../../utils/editorUtils';
import { useMonacoAIAssistant } from './hooks/useMonacoAIAssistant';
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
  theme?: string;
  fontSize?: number;
  readOnly?: boolean;
  minimap?: boolean;
  onAIRequest?: (context: any) => Promise<any[]>; // AI assistance callback
  aiEnabled?: boolean;
  realtimeAI?: boolean;
}

export interface MonacoEditorRef {
  getEditor: () => any;
  goToLine: (lineNumber: number, column?: number) => void;
  getCurrentLine: () => number;
  getTotalLines: () => number;
  openFind: () => void;
  openFindReplace: () => void;
  goToSymbol: () => void;
}

export const MonacoEditorWrapper = forwardRef<MonacoEditorRef, MonacoEditorWrapperProps>(({
  selectedFile,
  fileContent,
  performanceMode,
  onContentChange,
  onSave,
  onAskAI,
  isLoading = false,
  theme = 'vs-dark',
  fontSize = 14,
  readOnly = false,
  minimap = true,
  onAIRequest,
  aiEnabled = true,
}, ref) => {
  const editorRef = useRef<any>(null);
  const isDisposedRef = useRef(false);
  const contentChangeTimeoutRef = useRef<number>();
  const lastContentRef = useRef<string>('');
  const isEditorReadyRef = useRef(false);
  const mountTimeoutRef = useRef<number>();
  
  // Cool UI state - simplified to prevent typing issues
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);

  // Get file language with fallback
  const language = useMemo(() => {
    if (!selectedFile) return 'plaintext';
    return getLanguageFromExtension(selectedFile.extension) || 'plaintext';
  }, [selectedFile]);

  // AI Assistant Integration
  const {
    enabled: aiAssistantEnabled,
    realtimeAssistance,
    toggleEnabled: toggleAIEnabled,
    toggleRealtimeAssistance,
    AIAssistantComponent
  } = useMonacoAIAssistant(
    editorRef.current, 
    language, 
    aiEnabled ? onAIRequest : undefined
  );

  // Expose editor methods via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
    goToLine: (lineNumber: number, column?: number) => {
      if (editorRef.current) {
        editorRef.current.setPosition({ lineNumber, column: column || 1 });
        editorRef.current.focus();
      }
    },
    getCurrentLine: () => {
      if (editorRef.current) {
        const position = editorRef.current.getPosition();
        return position ? position.lineNumber : 1;
      }
      return 1;
    },
    getTotalLines: () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        return model ? model.getLineCount() : 1;
      }
      return 1;
    },
    openFind: () => {
      if (editorRef.current) {
        editorRef.current.getAction('actions.find')?.run();
      }
    },
    openFindReplace: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.startFindReplaceAction')?.run();
      }
    },
    goToSymbol: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.quickOutline')?.run();
      }
    }
  }), []);

  // Enhanced editor disposal with better cleanup
  const disposeEditor = useCallback(() => {
    if (editorRef.current && !isDisposedRef.current) {
      try {
        console.log('🧹 Disposing Monaco Editor...');
        
        // Clear any pending timeouts
        if (contentChangeTimeoutRef.current) {
          clearTimeout(contentChangeTimeoutRef.current);
          contentChangeTimeoutRef.current = undefined;
        }
        
        if (mountTimeoutRef.current) {
          clearTimeout(mountTimeoutRef.current);
          mountTimeoutRef.current = undefined;
        }
        
        // Mark as disposed and not ready before cleanup
        isDisposedRef.current = true;
        isEditorReadyRef.current = false;
        
        // Dispose of the editor instance safely
        if (editorRef.current && typeof editorRef.current.dispose === 'function') {
          editorRef.current.dispose();
        }
        
        // Clear the reference
        editorRef.current = null;
        setIsEditorMounted(false);
        
        console.log('✅ Monaco Editor disposed successfully');
      } catch (error) {
        console.warn('⚠️ Error during editor disposal:', error);
      }
    }
  }, []);

  // Debounced content change handler for better performance
  const handleContentChange = useCallback((value: string | undefined) => {
    if (isDisposedRef.current || !isEditorReadyRef.current || !value) return;
    
    // Avoid unnecessary updates if content hasn't changed
    if (value === lastContentRef.current) return;
    lastContentRef.current = value;
    
    // Clear existing timeout
    if (contentChangeTimeoutRef.current) {
      clearTimeout(contentChangeTimeoutRef.current);
    }
    
    // Debounce content changes for better performance
    const debounceMs = performanceMode ? 500 : 150;
    contentChangeTimeoutRef.current = window.setTimeout(() => {
      if (!isDisposedRef.current && isEditorReadyRef.current) {
        onContentChange(value);
      }
    }, debounceMs);
  }, [onContentChange, performanceMode]);

  // Cool editor mount handler with animations
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    console.log('🚀 Monaco Editor mounted successfully');
    
    editorRef.current = editor;
    isEditorReadyRef.current = true;
    isDisposedRef.current = false;
    setIsEditorMounted(true);
    
    // Simple ready state
    setShowLoadingAnimation(false);

    // Enhanced keyboard shortcuts with visual feedback
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Add save animation
      const saveIndicator = document.createElement('div');
      saveIndicator.innerHTML = '💾 Saved!';
      saveIndicator.className = 'fixed top-4 right-4 bg-green-500/90 text-white px-3 py-2 rounded-lg shadow-lg z-50 animate-pulse';
      document.body.appendChild(saveIndicator);
      
      onSave();
      
      setTimeout(() => {
        saveIndicator.style.opacity = '0';
        saveIndicator.style.transform = 'translateY(-10px)';
        setTimeout(() => document.body.removeChild(saveIndicator), 300);
      }, 1000);
    });

    // AI assistance shortcut (Ctrl+K)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      onAskAI();
    });

    // Toggle AI assistant (Ctrl+Shift+A)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
      toggleAIEnabled();
      const status = aiAssistantEnabled ? 'disabled' : 'enabled';
      
      // Show feedback
      const indicator = document.createElement('div');
      indicator.innerHTML = `🤖 AI Assistant ${status}`;
      indicator.className = 'fixed top-4 right-4 bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(indicator);
      
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => document.body.removeChild(indicator), 300);
      }, 2000);
    });

    // Add smooth cursor animations
    if (!performanceMode) {
      editor.updateOptions({
        cursorSmoothCaretAnimation: true,
        smoothScrolling: true,
      });
    }

    // Cool focus effects
    editor.onDidFocusEditorWidget(() => {
      const container = editor.getDomNode();
      if (container) {
        container.style.boxShadow = '0 0 20px rgba(0, 122, 255, 0.3)';
        container.style.transition = 'box-shadow 0.3s ease';
      }
    });

    editor.onDidBlurEditorWidget(() => {
      const container = editor.getDomNode();
      if (container) {
        container.style.boxShadow = 'none';
      }
    });

  }, [onSave, onAskAI, performanceMode, toggleAIEnabled, aiAssistantEnabled]);

  // Show loading animation when needed - Fixed to not interfere with typing
  useEffect(() => {
    if (isLoading) {
      setShowLoadingAnimation(true);
      // Don't change editor opacity when just loading - keep it visible for typing
    } else if (isEditorMounted) {
      setShowLoadingAnimation(false);
    }
  }, [isLoading, isEditorMounted]);

  // Enhanced editor configuration with performance optimizations
  const editorOptions = useMemo(() => {
    const baseOptions = {
      ...EDITOR_OPTIONS,
      fontSize,
      readOnly,
      theme,
      minimap: { enabled: minimap && !performanceMode },
      
      // Performance optimizations
      scrollBeyondLastLine: false,
      renderWhitespace: performanceMode ? 'none' : 'selection',
      renderLineHighlight: performanceMode ? 'none' : 'line',
      cursorBlinking: performanceMode ? ('solid' as const) : ('blink' as const),
      cursorSmoothCaretAnimation: performanceMode ? ('off' as const) : ('on' as const),
      smoothScrolling: !performanceMode,
      renderValidationDecorations: performanceMode ? 'off' as const : 'on' as const,
      
      // Enhanced editing features
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: 'on',
      accessibilitySupport: 'auto' as const,
      autoIndent: 'full',
      automaticLayout: true,
      codeLens: !performanceMode,
      colorDecorators: !performanceMode,
      contextmenu: true,
      copyWithSyntaxHighlighting: true,
      cursorStyle: 'line' as const,
      cursorWidth: 2,
      disableLayerHinting: performanceMode,
      disableMonospaceOptimizations: false,
      dragAndDrop: true,
      emptySelectionClipboard: false,
      extraEditorClassName: '',
      fastScrollSensitivity: 5,
      find: {
        cursorMoveOnFindWidget: true,
        seedSearchStringFromSelection: 'always' as const,
        autoFindInSelection: 'never' as const,
        addExtraSpaceOnTop: true,
        loop: true,
      },
      folding: !performanceMode,
      foldingHighlight: !performanceMode,
      foldingImportsByDefault: false,
      fontLigatures: !performanceMode,
      formatOnPaste: true,
      formatOnType: !performanceMode,
      glyphMargin: true,
      hideCursorInOverviewRuler: false,
      highlightActiveIndentGuide: !performanceMode,
      hover: {
        enabled: !performanceMode,
        delay: performanceMode ? 1000 : 300,
        sticky: true,
      },
      lineDecorationsWidth: 10,
      lineNumbers: 'on' as const,
      lineNumbersMinChars: 3,
      links: true,
      matchBrackets: performanceMode ? 'never' : 'always',
      mouseWheelScrollSensitivity: 1,
      mouseWheelZoom: false,
      multiCursorMergeOverlapping: true,
      multiCursorModifier: 'alt' as const,
      overviewRulerBorder: true,
      overviewRulerLanes: performanceMode ? 2 : 3,
      padding: { top: 0, bottom: 0 },
      parameterHints: { enabled: !performanceMode },
      quickSuggestions: !performanceMode,
      quickSuggestionsDelay: performanceMode ? 1000 : 500,
      renderControlCharacters: false,
      renderFinalNewline: 'on' as const,
      renderIndentGuides: !performanceMode,
      rulers: [],
      scrollbar: {
        useShadows: !performanceMode,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        vertical: 'visible' as const,
        horizontal: 'visible' as const,
        verticalScrollbarSize: 14,
        horizontalScrollbarSize: 12,
        arrowSize: 11,
      },
      selectOnLineNumbers: true,
      selectionClipboard: false,
      selectionHighlight: !performanceMode,
      showFoldingControls: performanceMode ? 'never' : 'mouseover',
      showUnused: !performanceMode,
      snippetSuggestions: performanceMode ? 'none' : 'top',
      suggestOnTriggerCharacters: !performanceMode,
      suggestSelection: 'first',
      tabCompletion: 'off',
      tabSize: 2,
      unusualLineTerminators: 'prompt' as const,
      useTabStops: true,
      wordWrap: 'off' as const,
      wordWrapBreakAfterCharacters: '\t})]?|/&.,;¢°¹²³£§€¥₹№…',
      wordWrapBreakBeforeCharacters: '([{\'"〈《「『【〔（［｛｢£¥＄￡￥',
      wrappingIndent: 'none' as const,
      wrappingStrategy: 'simple' as const,
    };

    // Large file optimizations
    if (selectedFile && fileContent.length > 100000) {
      return {
        ...baseOptions,
        minimap: { enabled: false },
        folding: false,
        wordWrap: 'off' as const,
        renderWhitespace: 'none',
        renderLineHighlight: 'none',
        cursorBlinking: 'solid' as const,
        cursorSmoothCaretAnimation: 'off' as const,
        smoothScrolling: false,
        quickSuggestions: false,
        parameterHints: { enabled: false },
        hover: { enabled: false },
        codeLens: false,
        colorDecorators: false,
        renderValidationDecorations: 'off' as const,
        matchBrackets: 'never',
        showUnused: false,
        selectionHighlight: false,
        occurrencesHighlight: false,
        renderIndentGuides: false,
        foldingHighlight: false,
        fontLigatures: false,
        formatOnType: false,
        snippetSuggestions: 'none',
        suggestOnTriggerCharacters: false,
      };
    }

    return baseOptions;
  }, [fontSize, readOnly, theme, minimap, performanceMode, selectedFile, fileContent.length]);

  // Enhanced editor validation handler with better error handling
  const handleEditorValidation = useCallback((markers: any[]) => {
    if (isDisposedRef.current) return;
    
    // Log validation markers in development
    if (process.env.NODE_ENV === 'development' && markers.length > 0) {
      console.log('📝 Editor validation markers:', markers.length);
    }
  }, []);

  // Enhanced editor mounting with null safety
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    if (!editor || !monaco || isDisposedRef.current) return;
    
    try {
      handleEditorDidMount(editor, monaco);
    } catch (error) {
      console.error('❌ Failed to mount Monaco editor:', error);
    }
  }, [handleEditorDidMount]);

  // Clean up on component unmount or file change
  useEffect(() => {
    isDisposedRef.current = false;
    isEditorReadyRef.current = false; // Reset ready state
    lastContentRef.current = fileContent;
    
    return () => {
      disposeEditor();
    };
  }, [selectedFile?.path, disposeEditor, fileContent]);

  // Update content reference when fileContent changes
  useEffect(() => {
    lastContentRef.current = fileContent;
  }, [fileContent]);

  // Show loading state
  if (isLoading || !selectedFile) {
    return (
      <div className="flex items-center justify-center h-full bg-vscode-editor">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-vscode-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-vscode-fg-muted">
            {isLoading ? 'Loading editor...' : 'No file selected'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Cool background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-vscode-editor via-vscode-editor to-vscode-editor/95 pointer-events-none" />
      
      {/* AI Assistant Controls */}
      {aiEnabled && (
        <div className="absolute top-3 right-3 z-20 flex items-center space-x-2">
          <button
            onClick={toggleAIEnabled}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-full shadow-lg backdrop-blur-sm transition-all
              ${aiAssistantEnabled 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
              }
            `}
            title={`AI Assistant: ${aiAssistantEnabled ? 'ON' : 'OFF'} (Ctrl+Shift+A)`}
          >
            🤖 AI {aiAssistantEnabled ? 'ON' : 'OFF'}
          </button>
          
          {aiAssistantEnabled && (
            <button
              onClick={toggleRealtimeAssistance}
              className={`
                px-2 py-1.5 text-xs rounded-full transition-all
                ${realtimeAssistance 
                  ? 'bg-blue-500/80 text-white' 
                  : 'bg-gray-500/80 text-white'
                }
              `}
              title={`Realtime assistance: ${realtimeAssistance ? 'ON' : 'OFF'}`}
            >
              ⚡
            </button>
          )}
        </div>
      )}
      
      {/* Animated performance indicator */}
      {performanceMode && (
        <div className="absolute top-3 left-3 z-20 animate-pulse">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            <span className="flex items-center gap-1">
              ⚡ Performance Mode
            </span>
          </div>
        </div>
      )}
      
      {/* Stylish large file warning */}
      {fileContent.length > 100000 && (
        <div className="absolute top-12 left-3 z-20 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            <span className="flex items-center gap-1">
              📁 Large File ({Math.round(fileContent.length / 1024)}KB)
            </span>
          </div>
        </div>
      )}

      {/* Cool loading overlay */}
      {showLoadingAnimation && (
        <div className="absolute inset-0 z-30 bg-vscode-editor/80 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
          <div className="text-center p-8 bg-vscode-sidebar/90 rounded-2xl shadow-2xl border border-vscode-border/50 backdrop-blur-md">
            {/* Modern spinner */}
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-vscode-accent/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-vscode-accent rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-2 border-transparent border-t-blue-400 rounded-full animate-spin animation-delay-150"></div>
            </div>
            <div className="text-vscode-fg font-medium mb-2">Loading Editor</div>
            <div className="text-vscode-fg-muted text-sm">Preparing your code...</div>
          </div>
        </div>
      )}
      
      {/* Editor container - simplified to prevent typing issues */}
      <div className="h-full w-full">
        <Editor
          key={selectedFile.path} // Force remount on file change for better stability
          height="100%"
          language={language}
          value={fileContent || ''} // Ensure value is never undefined
          onChange={handleContentChange}
          onMount={handleEditorMount}
          onValidate={handleEditorValidation}
          options={editorOptions as any}
          theme={theme}
          loading={
            <div className="flex items-center justify-center h-full bg-vscode-editor">
              <div className="text-center p-6">
                {/* Ultra-modern loading animation */}
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-vscode-accent/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-vscode-accent border-r-vscode-accent rounded-full animate-spin"></div>
                  <div className="absolute inset-3 border-2 border-transparent border-t-blue-400 border-r-blue-400 rounded-full animate-spin animation-delay-300"></div>
                  <div className="absolute inset-6 w-4 h-4 bg-vscode-accent rounded-full animate-pulse"></div>
                </div>
                <div className="text-vscode-fg font-medium text-lg mb-2">
                  Initializing Monaco Editor
                </div>
                <div className="text-vscode-fg-muted text-sm">
                  Setting up the ultimate coding experience...
                </div>
                {/* Progress bar animation */}
                <div className="mt-4 w-32 h-1 bg-vscode-border rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-vscode-accent to-blue-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* AI Assistant Component */}
      {aiEnabled && <AIAssistantComponent />}

      {/* Subtle editor border */}
      <div className="absolute inset-0 pointer-events-none border border-vscode-border/20 rounded-lg" />
    </div>
  );
}); 