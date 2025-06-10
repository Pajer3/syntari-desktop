// Syntari AI IDE - Monaco Editor Wrapper Component
// Enhanced for better performance and smoother UI experience

import { useCallback, useRef, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import Editor from '@monaco-editor/react';
import { getLanguageFromExtension } from '../../utils/editorUtils';
import { useMonacoAIAssistant } from './hooks/useMonacoAIAssistant';
import type { PerformanceConfig } from './usePerformanceConfig';
import type { EditorFile } from './useFileCache';
import React from 'react';
import { 
  shouldUsePerformanceMode, 
  getEditorOptions, 
  PERFORMANCE_THRESHOLDS
} from '../../constants/editorConfig';
import { registerCustomThemes, THEME_NAMES } from '../../constants/monacoThemes';

interface MonacoEditorWrapperProps {
  selectedFile: EditorFile | null;
  fileContent: string;
  perfConfig: PerformanceConfig;
  performanceMode: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onAskAI: () => void;
  theme?: string;
  fontSize?: number;
  readOnly?: boolean;
  minimap?: boolean;
  onAIRequest?: (context: any) => Promise<any[]>; // AI assistance callback
  aiEnabled?: boolean;
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

// Add Error Boundary component for Monaco Editor
class MonacoErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Monaco Editor Error Boundary caught error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="monaco-error-fallback p-4 text-center">
          <div className="text-red-400 mb-2">⚠️ Editor Error</div>
          <div className="text-sm text-gray-400 mb-4">
            The editor encountered an error and needs to reload.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reload Editor
          </button>
          {this.state.error && (
            <details className="mt-4 text-xs text-gray-500">
              <summary>Error Details</summary>
              <pre className="mt-2 text-left bg-gray-800 p-2 rounded">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export const MonacoEditorWrapper = forwardRef<MonacoEditorRef, MonacoEditorWrapperProps>(({
  selectedFile,
  fileContent,
  performanceMode,
  onContentChange,
  onSave,
  onAskAI,
  theme = THEME_NAMES.GRAY_DARK,
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
  const [monacoError, setMonacoError] = useState<string | null>(null);

  // Performance configuration based on VSCode standards
  const performanceConfig = useMemo(() => {
    const lineCount = fileContent ? fileContent.split('\n').length : 0;
    const charCount = fileContent ? fileContent.length : 0;
    const estimatedFileSize = charCount * 2; // Rough estimate (UTF-16)
    
    // Use VSCode's performance detection algorithm
    const performanceMode = shouldUsePerformanceMode(
      estimatedFileSize,
      lineCount,
      fileContent
    );
    
    return {
      performanceMode,
      lineCount,
      charCount,
      estimatedFileSize,
      // Performance indicators
      isLargeFile: estimatedFileSize > PERFORMANCE_THRESHOLDS.LARGE_FILE_SIZE,
      isLongFile: lineCount > PERFORMANCE_THRESHOLDS.LARGE_FILE_LINE_COUNT,
      hasLongLines: fileContent ? fileContent.split('\n').some(line => 
        line.length > PERFORMANCE_THRESHOLDS.MAX_TOKENIZATION_LINE_LENGTH
      ) : false,
    };
  }, [fileContent]);

  // Get file language with fallback
  const language = useMemo(() => {
    if (!selectedFile) return 'plaintext';
    return getLanguageFromExtension(selectedFile.extension) || 'plaintext';
  }, [selectedFile]);

  // AI Assistant Integration
  const {
    enabled: aiAssistantEnabled,
    toggleEnabled: toggleAIEnabled,
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
    
    // Validate editor before storing reference
    if (!editor || !editor.getModel || typeof editor.layout !== 'function') {
      console.error('❌ Invalid editor object received in mount handler');
      return;
    }

    editorRef.current = editor;
    isEditorReadyRef.current = true;
    isDisposedRef.current = false;
    
    // Ensure editor layout is stable
    try {
      editor.layout();
    } catch (layoutError) {
      console.warn('⚠️ Initial editor layout failed:', layoutError);
    }
    
    // Store reference only after validation
    editorRef.current = editor;
    
    // Ensure editor layout is stable with error handling
    try {
      editor.layout();
    } catch (layoutError) {
      console.warn('⚠️ Initial editor layout failed:', layoutError);
    }
    
    // Set ready flag only after everything is validated
    isEditorReadyRef.current = true;
    isDisposedRef.current = false;
    
    console.log('✅ Monaco Editor mounted and ready');

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
        container.style.boxShadow = '0 0 20px rgba(0, 122, 255, 0.1)';
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

  // Enhanced editor configuration with VSCode-based optimizations
  const editorOptions = useMemo(() => {
    // Get base options based on performance mode
    const baseOptions = getEditorOptions(performanceConfig.performanceMode, {
      fontSize,
      readOnly,
      theme,
      // Override minimap based on performance and user preference
      minimap: { 
        enabled: minimap && !performanceConfig.performanceMode,
        side: 'right',
        showSlider: 'mouseover',
        renderCharacters: !performanceConfig.performanceMode,
        maxColumn: 120,
        scale: 1,
      },
    });

    return baseOptions;
  }, [fontSize, readOnly, theme, minimap, performanceConfig.performanceMode]);

  // Monaco error handler - must be defined before use
  const handleMonacoError = useCallback((error: any) => {
    console.error('❌ Monaco Editor critical error:', error);
    setMonacoError(error?.message || 'Monaco Editor failed to load');
  }, []);

  // Enhanced editor validation handler with better error handling
  const handleEditorValidation = useCallback((markers: any[]) => {
    if (isDisposedRef.current) return;
    
    // Log validation markers in development
    if (process.env.NODE_ENV === 'development' && markers.length > 0) {
      console.log('📝 Editor validation markers:', markers.length);
    }
  }, []);

  // Enhanced editor mounting with null safety and progressive feature enabling
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    if (!editor || !monaco || isDisposedRef.current) {
      console.warn('⚠️ Monaco mount cancelled - invalid editor or disposed');
      return;
    }
    
    try {
      // Register custom themes first
      registerCustomThemes(monaco);
      
      // Apply the gray-dark theme explicitly
      monaco.editor.setTheme('gray-dark');
      
      // Ensure editor is fully initialized before proceeding
      const model = editor.getModel();
      if (!model || typeof model.getValue !== 'function') {
        console.warn('⚠️ Monaco editor model not ready, delaying mount...');
        setTimeout(() => handleEditorMount(editor, monaco), 100);
        return;
      }

      // Validate editor methods exist
      if (typeof editor.layout !== 'function' || typeof editor.getPosition !== 'function') {
        console.warn('⚠️ Monaco editor methods not available, delaying mount...');
        setTimeout(() => handleEditorMount(editor, monaco), 100);
        return;
      }

      handleEditorDidMount(editor, monaco);
      
      // Store reference only after validation
      editorRef.current = editor;
      
      // Ensure editor layout is stable with error handling
      try {
        editor.layout();
      } catch (layoutError) {
        console.warn('⚠️ Initial editor layout failed:', layoutError);
      }
      
      // Set ready flag only after everything is validated
      isEditorReadyRef.current = true;
      isDisposedRef.current = false;
      
      console.log('✅ Monaco Editor mounted and ready');
      
      // NO delayed feature enabling to prevent layout shifts
      // All features are now enabled immediately to maintain stable layout
      
    } catch (error) {
      console.error('❌ Failed to mount Monaco editor:', error);
      handleMonacoError(error);
      // Reset state on error
      isEditorReadyRef.current = false;
      editorRef.current = null;
    }
  }, [handleEditorDidMount, handleMonacoError]);

  // Clean up on component unmount or file change
  useEffect(() => {
    isDisposedRef.current = false;
    isEditorReadyRef.current = false; // Reset ready state
    lastContentRef.current = fileContent;
    
    return () => {
      disposeEditor();
    };
  }, [selectedFile?.path, disposeEditor, fileContent]);

  // Language and content updates are now handled via the key prop and value prop
  // This prevents race conditions by forcing clean remounts when files change

  // Handle Monaco errors gracefully
  const handleMonacoErrorBoundary = useCallback((error: Error) => {
    console.error('🚨 Monaco Error Boundary triggered:', error);
    isEditorReadyRef.current = false;
    editorRef.current = null;
    handleMonacoError(error);
  }, [handleMonacoError]);

  // Show no file state only (no loading since we removed isLoading)
  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full bg-vscode-editor">
        <div className="text-center text-vscode-fg-muted">
          No file selected
        </div>
      </div>
    );
  }

  if (monacoError) {
    return (
      <div className="flex items-center justify-center h-full bg-vscode-editor">
        <div className="text-center p-6">
          <div className="text-red-400 mb-4">⚠️ Editor Loading Error</div>
          <div className="text-vscode-fg-muted text-sm mb-4">
            Monaco Editor failed to initialize properly.
          </div>
          <button 
            onClick={() => {
              setMonacoError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-vscode-accent text-white rounded hover:bg-vscode-accent/80"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="monaco-editor-container h-full">
      {/* Performance mode indicator */}
      {performanceConfig.performanceMode && (
        <div className="performance-mode-indicator">
          <span className="performance-badge">⚡ Performance Mode</span>
          <span className="performance-details">
            {performanceConfig.isLargeFile && "Large file"} 
            {performanceConfig.isLongFile && "Long file"} 
            {performanceConfig.hasLongLines && "Long lines"}
          </span>
        </div>
      )}
      
      {/* VSCode-style file size warning */}
      {performanceConfig.isLargeFile && (
        <div className="large-file-warning">
          <span className="warning-badge">
            ⚠️ Large file ({Math.round(performanceConfig.estimatedFileSize / 1024 / 1024)}MB) - Some features disabled for performance
          </span>
        </div>
      )}

      <MonacoErrorBoundary onError={handleMonacoErrorBoundary}>
        <Editor
          key={selectedFile.path} // Force remount when file changes - this prevents race conditions
          height="100%"
          language={language}
          value={fileContent || ''}
          onChange={handleContentChange}
          onMount={handleEditorMount}
          onValidate={handleEditorValidation}
          options={editorOptions}
          loading={
            <div className="monaco-loading">
              <div className="loading-spinner"></div>
              <span>Loading editor...</span>
            </div>
          }
        />
      </MonacoErrorBoundary>

      {/* Performance status indicator */}
      <div className="editor-status-bar">
        {performanceConfig.performanceMode && (
          <div className="status-item performance">
            <span className="status-icon">⚡</span>
            <span className="status-text">Performance Mode</span>
          </div>
        )}
        
        <div className="status-item file-info">
          <span className="status-text">
            {performanceConfig.lineCount} lines, {Math.round(performanceConfig.charCount / 1024)}KB
          </span>
        </div>

        {language && (
          <div className="status-item language">
            <span className="status-text">{language.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* AI Assistant Component */}
      {aiEnabled && <AIAssistantComponent />}
    </div>
  );
}); 