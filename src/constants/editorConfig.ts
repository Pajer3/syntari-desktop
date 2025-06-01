// Syntari AI IDE - VS Code-style Monaco Editor Performance Configuration
// Unified professional editor settings with performance optimizations

export const EDITOR_OPTIONS = {
  // Core editor settings (enhanced from original)
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
  fontLigatures: true,
  lineHeight: 20,
  letterSpacing: 0.5,
  tabSize: 2,
  insertSpaces: true,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line' as const,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  
  // VS Code-style performance optimizations
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: 'off' as const, // Performance: disable by default
  wordWrapColumn: 120,
  theme: 'vscode-professional',
  
  // Minimap configuration (performance optimized)
  minimap: {
    enabled: true,
    side: 'right' as const,
    scale: 1,
    showSlider: 'mouseover' as const,
    maxColumn: 120, // Limit minimap rendering for performance
  },
  
  // Bracket pair colorization
  bracketPairColorization: {
    enabled: true,
    independentColorPoolPerBracketType: true,
  },
  
  // Guide lines
  guides: {
    indentation: true,
    bracketPairs: true,
    bracketPairsHorizontal: true,
    highlightActiveIndentation: true,
  },
  
  // IntelliSense suggestions (performance optimized)
  suggest: {
    enabled: true,
    showKeywords: true,
    showSnippets: true,
    showFunctions: true,
    showConstructors: true,
    showFields: true,
    showVariables: true,
    showClasses: true,
    showStructs: true,
    showInterfaces: true,
    showModules: true,
    showProperties: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showReferences: true,
    showFolders: true,
    showTypeParameters: true,
    showIssues: true,
    showUsers: true,
    showColors: true,
    insertMode: 'insert' as const,
    filterGraceful: true,
    localityBonus: true,
  },
  
  // Quick suggestions (optimized)
  quickSuggestions: {
    other: true,
    comments: false, // Performance: disable in comments
    strings: false,  // Performance: disable in strings
  },
  
  // Parameter hints
  parameterHints: {
    enabled: true,
    cycle: false,
  },
  
  // Auto-completion behavior
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: 'on' as const,
  suggestOnTriggerCharacters: true,
  
  // Accessibility
  accessibilitySupport: 'auto' as const,
  
  // Auto-indentation
  autoIndent: 'full' as const,
  
  // Code lens
  codeLens: true,
  
  // Color decorators
  colorDecorators: true,
  
  // Context menu
  contextmenu: true,
  
  // Copy with syntax highlighting
  copyWithSyntaxHighlighting: true,
  
  // Drag and drop
  dragAndDrop: true,
  
  // Find configuration
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: 'never' as const,
    seedSearchStringFromSelection: 'always' as const,
    globalFindClipboard: false,
  },
  
  // Code folding (performance optimized)
  folding: true,
  foldingStrategy: 'auto' as const,
  foldingHighlight: false, // Performance: disable highlighting
  unfoldOnClickAfterEndOfLine: false,
  showFoldingControls: 'mouseover' as const,
  
  // Formatting (performance optimized)
  formatOnPaste: false, // Performance: disable for large files
  formatOnType: false,  // Performance: disable for large files
  
  // Glyph margin
  glyphMargin: true,
  
  // Hide cursor in overview ruler
  hideCursorInOverviewRuler: false,
  
  // Highlight active indent guide
  highlightActiveIndentGuide: true,
  
  // Links
  links: true,
  
  // Mouse wheel zoom
  mouseWheelZoom: true,
  
  // Multi-cursor
  multiCursorMergeOverlapping: true,
  multiCursorModifier: 'alt' as const,
  
  // Occurrences highlight
  occurrencesHighlight: 'singleFile' as const,
  
  // Overview ruler border
  overviewRulerBorder: true,
  overviewRulerLanes: 3,
  
  // Render control characters (performance optimized)
  renderControlCharacters: false,
  
  // Render indent guides
  renderIndentGuides: true,
  
  // Render line highlight
  renderLineHighlight: 'line' as const,
  
  // Render whitespace (performance optimized)
  renderWhitespace: 'selection' as const, // Only show when selecting
  
  // Reveal horizontal right padding
  revealHorizontalRightPadding: 5,
  
  // Scrollbar configuration (performance optimized)
  scrollbar: {
    vertical: 'auto' as const,
    horizontal: 'auto' as const,
    arrowSize: 11,
    useShadows: false, // Better performance
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 14,
    horizontalScrollbarSize: 14,
    verticalSliderSize: 14,
    horizontalSliderSize: 14,
    handleMouseWheel: true,
  },
  
  // Selection on line numbers
  selectOnLineNumbers: true,
  
  // Selection clipboard
  selectionClipboard: false,
  
  // Selection highlight
  selectionHighlight: true,
  
  // Smooth scrolling (performance aware)
  smoothScrolling: true,
  
  // Snippet suggestions
  snippetSuggestions: 'top' as const,
  
  // Sticky tab stops
  stickyTabStops: false,
  
  // Tab completion
  tabCompletion: 'on' as const,
  
  // Use tab stops
  useTabStops: true,
  
  // Word based suggestions
  wordBasedSuggestions: 'currentDocument' as const,
  
  // Word separators
  wordSeparators: '`~!@#$%^&*()-=+[{]}\\|;:\'",./<>/?',
  
  // Word wrap break characters
  wordWrapBreakAfterCharacters: '\t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ"〉》」』】〕）］｝｠',
  wordWrapBreakBeforeCharacters: '([{\'"〈《「『【〔（［｛｟',
  
  // Wrapping indent
  wrappingIndent: 'indent' as const,
  
  // Wrapping strategy
  wrappingStrategy: 'advanced' as const,
  
  // Ruler
  rulers: [80, 120] as number[],
  
  // Padding
  padding: {
    top: 16,
    bottom: 16,
  },
  
  // VS Code-style performance optimizations
  fastScrollSensitivity: 5,
  mouseWheelScrollSensitivity: 1,
  disableLayerHinting: true, // Better performance on some systems
  largeFileOptimizations: true,
  maxTokenizationLineLength: 10000, // VS Code uses 20k, but 10k is safer
  
  // Sticky scroll
  stickyScroll: {
    enabled: true,
    maxLineCount: 5,
  },
} as const;

// Performance-optimized options for large files (> 1MB)
export const LARGE_FILE_EDITOR_OPTIONS = {
  ...EDITOR_OPTIONS,
  
  // Disable expensive features for large files
  minimap: {
    enabled: false, // Disable minimap for large files
  },
  folding: false,
  renderWhitespace: 'none',
  renderControlCharacters: false,
  lightbulb: {
    enabled: false, // Disable code actions for performance
  },
  
  // Aggressive performance settings
  quickSuggestions: false,
  parameterHints: {
    enabled: false,
  },
  hover: {
    enabled: false,
  },
  
  // Limit rendering
  maxTokenizationLineLength: 5000, // Even more conservative
  stopRenderingLineAfter: 10000,
  
  // Fast scrolling
  fastScrollSensitivity: 10,
} as const;

// Language mappings for file extensions
export const LANGUAGE_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.rs': 'rust',
  '.py': 'python',
  '.md': 'markdown',
  '.json': 'json',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.ps1': 'powershell',
  '.psm1': 'powershell',
  '.psd1': 'powershell',
  '.sql': 'sql',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.lua': 'lua',
  '.dart': 'dart',
  '.r': 'r',
  '.jl': 'julia',
  '.scala': 'scala',
  '.clj': 'clojure',
  '.elm': 'elm',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hrl': 'erlang',
  '.fs': 'fsharp',
  '.fsx': 'fsharp',
  '.ml': 'ocaml',
  '.mli': 'ocaml',
  '.hs': 'haskell',
  '.lhs': 'haskell',
  '.dockerfile': 'dockerfile',
  '.Dockerfile': 'dockerfile',
  '.tex': 'latex',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

// Professional file icons that match VSCode
export const FILE_ICONS: Record<string, string> = {
  '.js': '📄',
  '.jsx': '⚛️',
  '.ts': '🔷',
  '.tsx': '⚛️',
  '.rs': '🦀',
  '.py': '🐍',
  '.md': '📝',
  '.json': '⚙️',
  '.html': '🌐',
  '.css': '🎨',
  '.scss': '🎨',
  '.sass': '🎨',
  '.less': '🎨',
  '.xml': '📄',
  '.yaml': '⚙️',
  '.yml': '⚙️',
  '.toml': '⚙️',
  '.ini': '⚙️',
  '.sh': '💻',
  '.bash': '💻',
  '.zsh': '💻',
  '.fish': '💻',
  '.ps1': '💻',
  '.sql': '🗄️',
  '.go': '🐹',
  '.java': '☕',
  '.kt': '🟣',
  '.swift': '🐦',
  '.c': '📘',
  '.cpp': '📘',
  '.h': '📘',
  '.hpp': '📘',
  '.cs': '💜',
  '.php': '🐘',
  '.rb': '💎',
  '.lua': '🌙',
  '.dart': '🎯',
  '.r': '📊',
  '.dockerfile': '🐳',
  '.Dockerfile': '🐳',
  '.vue': '💚',
  '.svelte': '🧡',
};

// VS Code-style file size thresholds
export const FILE_SIZE_THRESHOLDS = {
  LARGE_FILE_WARNING: 1024 * 1024,      // 1MB - show warning
  LARGE_FILE_OPTIMIZATIONS: 5 * 1024 * 1024,  // 5MB - use aggressive optimizations
  MAX_EDITOR_SIZE: 64 * 1024 * 1024,    // 64MB - refuse to tokenize (like VS Code)
  MAX_SAFE_SIZE: 256 * 1024 * 1024,     // 256MB - hex mode only
} as const;

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  RENDER_WARNING_MS: 16,  // 60fps = 16ms per frame
  SCROLL_WARNING_MS: 8,   // Scrolling should be < 8ms
  TOKENIZE_WARNING_MS: 100, // Tokenization warning
} as const; 