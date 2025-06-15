// Syntari AI IDE - Monaco Editor Wrapper Component
// Enhanced for better performance and smoother UI experience

import React, { useCallback, useRef, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import Editor from '@monaco-editor/react';
import { getLanguageFromExtension } from '../../services/languageService';
import { useMonacoAIAssistant } from './hooks/useMonacoAIAssistant';
import type { PerformanceConfig } from './usePerformanceConfig';
import type { EditorFile } from './useFileCache';
import { 
  shouldUsePerformanceMode, 
  getEditorOptions, 
  PERFORMANCE_THRESHOLDS
} from '../../constants/editorConfig';
import { registerCustomThemes, THEME_NAMES } from '../../constants/monacoThemes';
import { useContextMenuHandler } from '../ui/ContextMenu';
import { useContextMenuIntegration } from '../../hooks/useContextMenuIntegration';
import { contextMenuService } from '../../services/contextMenuService';

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
  // Add state to control when Editor is safe to render
  const [editorCanRender, setEditorCanRender] = useState(false);
  // Add state to track when full features can be enabled
  const [featuresEnabled, setFeaturesEnabled] = useState(false);
  // Context menu state
  const [hasSelection, setHasSelection] = useState(false);

  // Context menu integration
  const { createEditorContextMenu } = useContextMenuIntegration();
  const handleContextMenu = useContextMenuHandler();

  // Check if text is selected in editor
  const checkSelection = useCallback(() => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const hasText = selection && !selection.isEmpty();
      setHasSelection(!!hasText);
      return !!hasText;
    }
    return false;
  }, []);

  // Handle editor context menu
  const handleEditorContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentHasSelection = checkSelection();
    const contextMenuItems = createEditorContextMenu(currentHasSelection);
    
    handleContextMenu(e, contextMenuItems);
  }, [createEditorContextMenu, handleContextMenu, checkSelection]);

  // Generate stable key that only changes when file actually changes, not content
  const stableKey = useMemo(() => {
    return selectedFile ? `monaco-${selectedFile.path}` : 'monaco-empty';
  }, [selectedFile?.path]);

  // Stability Check: Only re-render when essential props change
  const stableContent = useMemo(() => {
    // Ensure content stability to prevent unnecessary Monaco re-renders
    if (typeof fileContent === 'string') {
      return fileContent;
    }
    return '';
  }, [fileContent]);

  const stableOptions = useMemo(() => {
    const baseOptions = getEditorOptions(performanceMode);
    
    return {
      ...baseOptions,
      fontSize,
      minimap: minimap ? baseOptions.minimap : { enabled: false },
      readOnly,
      theme,
    };
  }, [performanceMode, fontSize, minimap, readOnly, theme]);

  // Development mode check for debugging

  // Only allow editor to render when we have a stable state
  useEffect(() => {
    if (!selectedFile) {
      setEditorCanRender(false);
      setFeaturesEnabled(false);
      return;
    }

    // Reset features state for new file
    setFeaturesEnabled(false);

    // CRITICAL: Only render if we have valid content (prevent null/undefined content issues)
    const hasValidContent = typeof stableContent === 'string';
    
    if (!hasValidContent) {
      console.log('⚠️ Waiting for valid content before rendering Monaco');
      setEditorCanRender(false);
      return;
    }

    // Small delay for stability, but not content-dependent
    const renderTimeout = setTimeout(() => {
      setEditorCanRender(true);
    }, 50);

    return () => {
      clearTimeout(renderTimeout);
      setEditorCanRender(false);
      setFeaturesEnabled(false);
    };
  }, [selectedFile?.path]); // Only depend on file path, NOT content

  // Performance configuration based on VSCode standards
  const performanceConfig = useMemo(() => {
    const lineCount = stableContent ? stableContent.split('\n').length : 0;
    const charCount = stableContent ? stableContent.length : 0;
    const estimatedFileSize = charCount * 2; // Rough estimate (UTF-16)
    
    // Use VSCode's performance detection algorithm
    const performanceMode = shouldUsePerformanceMode(
      estimatedFileSize,
      lineCount,
      stableContent
    );
    
    return {
      performanceMode,
      lineCount,
      charCount,
      estimatedFileSize,
      // Performance indicators
      isLargeFile: estimatedFileSize > PERFORMANCE_THRESHOLDS.LARGE_FILE_SIZE,
      isLongFile: lineCount > PERFORMANCE_THRESHOLDS.LARGE_FILE_LINE_COUNT,
      hasLongLines: stableContent ? stableContent.split('\n').some(line => 
        line.length > PERFORMANCE_THRESHOLDS.MAX_TOKENIZATION_LINE_LENGTH
      ) : false,
    };
  }, [stableContent]);

  // Get file language with fallback
  const language = useMemo(() => {
    if (!selectedFile) return 'plaintext';
    return getLanguageFromExtension(selectedFile.extension) || 'plaintext';
  }, [selectedFile]);

  // AI Assistant Integration - COMPLETELY DISABLED FOR NOW to ensure Monaco stability
  const aiAssistantResult = {
    enabled: false,
    realtimeAssistance: false,
    suggestions: [],
    isLoading: false,
    showWidget: false,
    toggleEnabled: () => {},
    toggleRealtimeAssistance: () => {},
    requestSuggestions: async () => {},
    applySuggestion: () => {},
    dismissSuggestions: () => {},
    AIAssistantComponent: () => null
  };

  // AI assistant features available but not currently used in this view
  // const {
  //   enabled: aiAssistantEnabled,
  //   suggestions: aiSuggestions,
  //   showWidget: showAIWidget,
  //   AIAssistantComponent,
  //   toggleEnabled: toggleAIEnabled
  // } = aiAssistantResult;

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

  // Dispose editor with enhanced cleanup
  const disposeEditor = useCallback(() => {
    if (editorRef.current && !isDisposedRef.current) {
      try {
        // Clear all timeouts first
        if (contentChangeTimeoutRef.current) {
          clearTimeout(contentChangeTimeoutRef.current);
          contentChangeTimeoutRef.current = undefined;
        }

        if (mountTimeoutRef.current) {
          clearTimeout(mountTimeoutRef.current);
          mountTimeoutRef.current = undefined;
        }

        // Reduce logging frequency
        // console.log('🧹 Disposing Monaco Editor...');
        
        isDisposedRef.current = true;
        isEditorReadyRef.current = false;
        
        // Dispose the Monaco editor instance
        editorRef.current.dispose();
        editorRef.current = null;
        
        // Clear editor reference from context menu service
        contextMenuService.setEditorRef(null);
        
        // console.log('✅ Monaco Editor disposed successfully');
      } catch (error) {
        console.error('❌ Error disposing Monaco Editor:', error);
        // Force cleanup even if there's an error
        isDisposedRef.current = true;
        isEditorReadyRef.current = false;
        editorRef.current = null;
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
    // Prevent duplicate mounting
    if (isDisposedRef.current || editorRef.current) {
      return;
    }

    try {
      // Reduce logging during mount process
      // console.log('🚀 Monaco Editor mounted successfully');
      
      editorRef.current = editor;
      isEditorReadyRef.current = true;

      // Register custom themes
      registerCustomThemes(monaco);

      // Set up selection change listener for context menu
      editor.onDidChangeCursorSelection(() => {
        checkSelection();
      });

      // Register editor with context menu service
      contextMenuService.setEditorRef(editor);

      // Add keyboard shortcut for AI assistant (Ctrl+K)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        contextMenuService.openAIAssistant();
      });

      // Register application-level shortcuts in Monaco to work when editor has focus
      const registerApplicationShortcuts = () => {
        console.log('🔑 Registering FOCUSED shortcuts in Monaco...');
        
        // FOCUSED IMPLEMENTATION - Only 3 critical shortcuts with enhanced registration
        
        // 1. CTRL+S (Save) - CRITICAL
        const saveCommandId = editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, 
          () => {
            console.log('🔑 Monaco: Ctrl+S triggered - dispatching save-file');
            window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'save-file' } }));
          },
          'syntari.save' // Unique context ID
        );
        
        // 2. CTRL+W (Close Tab) - CRITICAL
        const closeTabCommandId = editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, 
          () => {
            console.log('🔑 Monaco: Ctrl+W triggered - dispatching close-tab');
            window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'close-tab' } }));
          },
          'syntari.closeTab' // Unique context ID
        );
        
        // 3. CTRL+SHIFT+P (Command Palette) - CRITICAL with higher priority
        const commandPaletteId = editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, 
          () => {
            console.log('🔑 Monaco: Ctrl+Shift+P triggered - dispatching command-palette');
            window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'command-palette' } }));
          },
          'syntari.commandPalette' // Unique context ID
        );
        
        // Also register with Monaco's action system for better integration
        editor.addAction({
          id: 'syntari.save',
          label: 'Save File',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: () => {
            console.log('🔑 Monaco Action: Save triggered');
            window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'save-file' } }));
          }
        });
        
        editor.addAction({
          id: 'syntari.closeTab',
          label: 'Close Tab',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW],
          run: () => {
            console.log('🔑 Monaco Action: Close Tab triggered');
            window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'close-tab' } }));
          }
        });
        
        editor.addAction({
          id: 'syntari.commandPalette',
          label: 'Show Command Palette',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP],
          run: () => {
            console.log('🔑 Monaco Action: Command Palette triggered');
            window.dispatchEvent(new CustomEvent('syntari:command', { detail: { type: 'command-palette' } }));
          }
        });
        
        console.log('🔑 Registered commands and actions:', { saveCommandId, closeTabCommandId, commandPaletteId });
      };
      
      registerApplicationShortcuts();

      // Add event handlers for context menu actions
      const addContextMenuEventListeners = () => {
        window.addEventListener('syntari:formatDocument', () => {
          if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument')?.run();
          }
        });
        
        window.addEventListener('syntari:goToDefinition', () => {
          if (editorRef.current) {
            editorRef.current.getAction('editor.action.revealDefinition')?.run();
          }
        });
        
        window.addEventListener('syntari:findReferences', () => {
          if (editorRef.current) {
            editorRef.current.getAction('editor.action.goToReferences')?.run();
          }
        });
        
        window.addEventListener('syntari:renameSymbol', () => {
          if (editorRef.current) {
            editorRef.current.getAction('editor.action.rename')?.run();
          }
        });
      };
      
      addContextMenuEventListeners();

      // Set up context menu on the editor DOM element
      const editorDomNode = editor.getDomNode();
      if (editorDomNode) {
        editorDomNode.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const currentHasSelection = checkSelection();
          const contextMenuItems = createEditorContextMenu(currentHasSelection);
          
          // Convert DOM event to React MouseEvent-like object
          const reactEvent = {
            clientX: e.clientX,
            clientY: e.clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation()
          } as React.MouseEvent;
          
          handleContextMenu(reactEvent, contextMenuItems);
        });
      }

      // Wait for the model to be fully ready before enabling features  
      const waitForModel = () => {
        const model = editor.getModel();
        if (model) {
          // Reduce logging frequency
          // console.log('✅ Monaco Editor model ready');
          
          // Enable features after a brief delay
          setTimeout(() => {
            setFeaturesEnabled(true);
            // console.log('✅ Monaco Editor features enabled');
          }, 100);
          
          // Apply full options after features are ready
          setTimeout(() => {
            // console.log('✅ Monaco Editor full options applied');
            editor.updateOptions({
              // Ensure stable layout after mounting
              automaticLayout: true,
              // Other options are already applied via the Editor component
            });
          }, 150);
        } else {
          // Model not ready yet, wait a bit more
          setTimeout(waitForModel, 50);
        }
      };

      waitForModel();

      // console.log('✅ Monaco Editor mounted and ready');
    } catch (error) {
      console.error('❌ Error in handleEditorDidMount:', error);
      setMonacoError(`Editor mount failed: ${error}`);
      isDisposedRef.current = false; // Allow retry
    }
  }, [checkSelection, createEditorContextMenu, handleContextMenu]);

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

    // Balanced safe options - keep essential functionality while preventing model access issues
    const balancedOptions = {
      ...baseOptions,
      
      // Keep essential editor features
      fontSize,
      fontFamily: baseOptions.fontFamily,
      readOnly,
      automaticLayout: true,
      
      // Safe model-related options
      bracketPairColorization: { enabled: !performanceConfig.performanceMode },
      guides: {
        bracketPairs: !performanceConfig.performanceMode,
        indentation: true, // Keep indentation guides
      },
      
      // Keep language features but make them safer
      quickSuggestions: !performanceConfig.performanceMode,
      suggestOnTriggerCharacters: !performanceConfig.performanceMode,
      codeLens: false, // Disable this as it can cause model access issues
      hover: { enabled: !performanceConfig.performanceMode },
      
      // Keep selection features
      occurrencesHighlight: 'singleFile' as const,
      selectionHighlight: true,
      renderWhitespace: 'selection' as const,
      renderControlCharacters: true,
      
      // Enhanced selection options for better visibility
      wordWrap: 'on' as const,
      wordWrapColumn: 120,
      selectOnLineNumbers: true,
      
      // Ensure proper selection styling
      theme: theme,
      
      // Safe folding
      folding: !performanceConfig.performanceMode,
      showFoldingControls: performanceConfig.performanceMode ? 'never' as const : 'always' as const,
      
      // Keep essential features
      links: true,
      colorDecorators: !performanceConfig.performanceMode,
      renderLineHighlight: 'line' as const,
      matchBrackets: 'always' as const,
      
      // Keep formatting features
      formatOnPaste: !performanceConfig.performanceMode,
      formatOnType: !performanceConfig.performanceMode,
      
      // Smoother experience
      cursorSmoothCaretAnimation: 'off' as const, // Keep off for performance
      smoothScrolling: false,
      
      // Keep context menu and find
      contextmenu: true,
      find: {
        ...baseOptions.find,
        seedSearchStringFromSelection: 'never' as const, // Fix type error
      },
    };

    return balancedOptions;
  }, [fontSize, readOnly, theme, minimap, performanceConfig.performanceMode]);

  // Enhanced options for after editor is stable (full feature set)
  const fullEditorOptions = useMemo(() => {
    return getEditorOptions(performanceConfig.performanceMode, {
      fontSize,
      readOnly,
      theme,
      minimap: { 
        enabled: minimap && !performanceConfig.performanceMode,
        side: 'right',
        showSlider: 'mouseover',
        renderCharacters: !performanceConfig.performanceMode,
        maxColumn: 120,
        scale: 1,
      },
    });
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
      console.log('🚀 Monaco mount starting...', { 
        hasEditor: !!editor, 
        hasMonaco: !!monaco,
        contentLength: stableContent.length 
      });

      // Register custom themes first
      registerCustomThemes(monaco);
      
      // Apply the gray-dark theme explicitly
      monaco.editor.setTheme('gray-dark');
      
      // CRITICAL: Wait for model AND validate it's actually usable
      const model = editor.getModel();
      if (!model) {
        console.warn('⚠️ No model available yet, retrying...');
        setTimeout(() => handleEditorMount(editor, monaco), 50);
        return;
      }

      // Validate model methods exist and are callable
      if (typeof model.getValue !== 'function' || 
          typeof model.getLineCount !== 'function' ||
          typeof model.getLineContent !== 'function') {
        console.warn('⚠️ Model methods not ready, retrying...');
        setTimeout(() => handleEditorMount(editor, monaco), 50);
        return;
      }

      // Validate editor methods exist
      if (typeof editor.layout !== 'function' || 
          typeof editor.getPosition !== 'function' ||
          typeof editor.updateOptions !== 'function') {
        console.warn('⚠️ Editor methods not available, retrying...');
        setTimeout(() => handleEditorMount(editor, monaco), 50);
        return;
      }

      // Test that we can safely call model methods
      try {
        const testValue = model.getValue();
        const testLineCount = model.getLineCount();
        console.log('✅ Model validation passed:', { 
          valueLength: testValue.length, 
          lineCount: testLineCount 
        });
      } catch (modelError) {
        console.warn('⚠️ Model validation failed, retrying...', modelError);
        setTimeout(() => handleEditorMount(editor, monaco), 50);
        return;
      }

      handleEditorDidMount(editor, monaco);
      
    } catch (error) {
      console.error('❌ Failed to mount Monaco editor:', error);
      handleMonacoError(error);
      // Reset state on error
      isEditorReadyRef.current = false;
      editorRef.current = null;
    }
  }, [handleEditorDidMount, handleMonacoError, stableContent.length]);

  // Clean up on component unmount or file change
  useEffect(() => {
    isDisposedRef.current = false;
    isEditorReadyRef.current = false; // Reset ready state
    lastContentRef.current = stableContent;
    
    return () => {
      disposeEditor();
    };
  }, [selectedFile?.path, disposeEditor, stableContent]);

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
    <div className="monaco-editor-container h-full" onContextMenu={handleEditorContextMenu}>
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
        {editorCanRender ? (
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-full bg-vscode-editor">
              <div className="monaco-loading">
                <div className="loading-spinner"></div>
                <span>Loading editor...</span>
              </div>
            </div>
          }>
            <Editor
              key={stableKey}
              height="100%"
              language={language}
              value={stableContent}
              onChange={handleContentChange}
              onMount={handleEditorMount}
              onValidate={handleEditorValidation}
              options={editorOptions}
              theme="vs-dark" // Use built-in theme for stability
              loading={
                <div className="monaco-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading editor...</span>
                </div>
              }
              path={selectedFile?.path} // Critical for model management
            />
          </React.Suspense>
        ) : (
          <div className="flex items-center justify-center h-full bg-vscode-editor">
            <div className="monaco-loading">
              <div className="loading-spinner"></div>
              <span>Preparing editor...</span>
            </div>
          </div>
        )}
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

      {/* AI Assistant Component - DISABLED FOR NOW */}
      {/* {aiEnabled && editorCanRender && featuresEnabled && <AIAssistantComponent />} */}
    </div>
  );
}); 