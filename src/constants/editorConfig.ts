// Syntari AI IDE - Professional Editor Configuration
// VSCode-inspired Monaco Editor settings

export const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: "'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
  fontLigatures: true,
  lineHeight: 19,
  letterSpacing: 0.5,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  cursorStyle: 'line' as const,
  cursorBlinking: 'smooth' as const,
  automaticLayout: true,
  wordWrap: 'on' as const,
  wordWrapColumn: 120,
  theme: 'vscode-professional',
  
  // Minimap configuration
  minimap: {
    enabled: true,
    side: 'right' as const,
    scale: 1,
    showSlider: 'mouseover' as const,
    size: 'fit' as const,
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
  
  // IntelliSense suggestions
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
  
  // Quick suggestions
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true,
  },
  
  // Parameter hints
  parameterHints: {
    enabled: true,
    cycle: false,
  },
  
  // Auto-completion behavior
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: 'on' as const,
  
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
  
  // Code folding
  folding: true,
  foldingStrategy: 'auto' as const,
  foldingHighlight: true,
  unfoldOnClickAfterEndOfLine: false,
  
  // Formatting
  formatOnPaste: true,
  formatOnType: true,
  
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
  
  // Render control characters
  renderControlCharacters: false,
  
  // Render indent guides
  renderIndentGuides: true,
  
  // Render line highlight
  renderLineHighlight: 'line' as const,
  
  // Render whitespace
  renderWhitespace: 'selection' as const,
  
  // Reveal horizontal right padding
  revealHorizontalRightPadding: 5,
  
  // Scrollbar configuration
  scrollbar: {
    vertical: 'visible' as const,
    horizontal: 'visible' as const,
    arrowSize: 11,
    useShadows: true,
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
  
  // Show folding controls
  showFoldingControls: 'mouseover' as const,
  
  // Smooth scrolling
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
  rulers: [80, 120],
  
  // Padding
  padding: {
    top: 16,
    bottom: 16,
  },
  
  // Fast scroll sensitivity
  fastScrollSensitivity: 5,
  
  // Mouse wheel scroll sensitivity
  mouseWheelScrollSensitivity: 1,
  
  // Sticky scroll
  stickyScroll: {
    enabled: true,
    maxLineCount: 5,
  },
};

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