// Syntari AI IDE - Custom Monaco Editor Themes
// Professional themes for enhanced coding experience

import { editor } from 'monaco-editor';

// Gray-Dark Theme with White Text - Professional IDE Style
export const GRAY_DARK_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Base text styling
    { token: '', foreground: 'ffffff', background: '3a3a3a' },
    
    // Comments
    { token: 'comment', foreground: 'a0a0a0', fontStyle: 'italic' },
    { token: 'comment.line', foreground: 'a0a0a0', fontStyle: 'italic' },
    { token: 'comment.block', foreground: 'a0a0a0', fontStyle: 'italic' },
    
    // Keywords
    { token: 'keyword', foreground: '6db3f2', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '6db3f2', fontStyle: 'bold' },
    { token: 'keyword.operator', foreground: 'ffffff' },
    
    // Strings
    { token: 'string', foreground: 'a5c261' },
    { token: 'string.quoted', foreground: 'a5c261' },
    { token: 'string.template', foreground: 'a5c261' },
    
    // Numbers
    { token: 'number', foreground: 'd19a66' },
    { token: 'number.hex', foreground: 'd19a66' },
    { token: 'number.float', foreground: 'd19a66' },
    
    // Functions
    { token: 'entity.name.function', foreground: 'dcdcaa' },
    { token: 'support.function', foreground: 'dcdcaa' },
    
    // Variables
    { token: 'variable', foreground: 'ffffff' },
    { token: 'variable.name', foreground: 'ffffff' },
    { token: 'variable.parameter', foreground: 'e6e6e6' },
    
    // Types
    { token: 'entity.name.type', foreground: '4ec9b0' },
    { token: 'entity.name.class', foreground: '4ec9b0' },
    { token: 'support.type', foreground: '4ec9b0' },
    
    // Constants
    { token: 'constant', foreground: '569cd6' },
    { token: 'constant.language', foreground: '569cd6' },
    { token: 'constant.numeric', foreground: 'd19a66' },
    
    // Operators
    { token: 'operator', foreground: 'ffffff' },
    
    // Punctuation
    { token: 'punctuation', foreground: 'ffffff' },
    { token: 'delimiter', foreground: 'ffffff' },
    
    // Tags (HTML/XML)
    { token: 'tag', foreground: '569cd6' },
    { token: 'tag.name', foreground: '569cd6' },
    { token: 'tag.attribute', foreground: '92c5f7' },
    
    // Properties (CSS/JSON)
    { token: 'support.property-name', foreground: '92c5f7' },
    { token: 'property', foreground: '92c5f7' },
    
    // Preprocessor
    { token: 'meta.preprocessor', foreground: 'c586c0' },
    
    // Invalid/Error
    { token: 'invalid', foreground: 'f44747', background: '5a1d1d' },
    { token: 'invalid.deprecated', foreground: 'f44747', fontStyle: 'underline' },
  ],
  colors: {
    // Editor background and basic colors
    'editor.background': '#3a3a3a',
    'editor.foreground': '#ffffff',
    'editorCursor.foreground': '#ffffff',
    'editor.lineHighlightBackground': '#404040',
    'editor.selectionBackground': '#505050',
    'editor.inactiveSelectionBackground': '#454545',
    
    // Line numbers
    'editorLineNumber.foreground': '#909090',
    'editorLineNumber.activeForeground': '#ffffff',
    
    // Gutter
    'editorGutter.background': '#303030',
    'editorGutter.modifiedBackground': '#1e8fff',
    'editorGutter.addedBackground': '#28a745',
    'editorGutter.deletedBackground': '#dc3545',
    
    // Scrollbar
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#79797966',
    'scrollbarSlider.hoverBackground': '#646464b3',
    'scrollbarSlider.activeBackground': '#bfbfbf66',
    
    // Minimap
    'minimap.background': '#303030',
    'minimap.selectionHighlight': '#505050',
    'minimap.errorHighlight': '#f44747',
    'minimap.warningHighlight': '#ffcc02',
    
    // Selection
    'editor.selectionHighlightBackground': '#4a4a4a',
    'editor.wordHighlightBackground': '#575757',
    'editor.wordHighlightStrongBackground': '#004972',
    
    // Find/replace widget
    'editorWidget.background': '#2d2d2d',
    'editorWidget.border': '#505050',
    'editorWidget.foreground': '#ffffff',
    
    // Suggest widget
    'editorSuggestWidget.background': '#2d2d2d',
    'editorSuggestWidget.border': '#505050',
    'editorSuggestWidget.foreground': '#ffffff',
    'editorSuggestWidget.selectedBackground': '#505050',
    
    // Hover widget
    'editorHoverWidget.background': '#2d2d2d',
    'editorHoverWidget.border': '#505050',
    'editorHoverWidget.foreground': '#ffffff',
    
    // Bracket matching
    'editorBracketMatch.background': '#0064001a',
    'editorBracketMatch.border': '#888888',
    
    // Error/warning squiggles
    'editorError.foreground': '#f44747',
    'editorWarning.foreground': '#ffcc02',
    'editorInfo.foreground': '#3794ff',
    
    // Indent guides
    'editorIndentGuide.background': '#505050',
    'editorIndentGuide.activeBackground': '#707070',
    
    // Whitespace
    'editorWhitespace.foreground': '#505050',
    
    // Rulers
    'editorRuler.foreground': '#505050',
  }
};

// Syntari Custom Theme (alternative)
export const SYNTARI_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'e8e8e8', background: '2b2b2b' },
    { token: 'comment', foreground: '7c7c7c', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'entity.name.function', foreground: 'dcdcaa' },
    { token: 'entity.name.type', foreground: '4ec9b0' },
  ],
  colors: {
    'editor.background': '#2b2b2b',
    'editor.foreground': '#e8e8e8',
    'editorCursor.foreground': '#e8e8e8',
    'editor.lineHighlightBackground': '#333333',
    'editor.selectionBackground': '#444444',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#e8e8e8',
    'editorGutter.background': '#262626',
  }
};

// Function to register custom themes with Monaco
export function registerCustomThemes(monaco: any) {
  try {
    // Register the gray-dark theme
    monaco.editor.defineTheme('gray-dark', GRAY_DARK_THEME);
    
    // Register the Syntari theme
    monaco.editor.defineTheme('syntari', SYNTARI_THEME);
    
    console.log('✅ Custom Monaco themes registered successfully');
  } catch (error) {
    console.error('❌ Failed to register custom Monaco themes:', error);
  }
}

// Theme names for easy reference
export const THEME_NAMES = {
  GRAY_DARK: 'gray-dark',
  SYNTARI: 'syntari',
  VS_DARK: 'vs-dark',
  VS_LIGHT: 'vs-light',
} as const;

export type ThemeName = typeof THEME_NAMES[keyof typeof THEME_NAMES]; 