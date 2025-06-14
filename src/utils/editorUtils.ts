// Syntari AI IDE - Editor Utility Functions
// Extracted from CodeEditor.tsx for better maintainability

// Re-export language detection from the canonical language service
export { getLanguageFromExtension } from '../services/languageService';

// Simple emoji-based file icons for backward compatibility
// This provides the old string-based API that existing components expect
export const getFileIcon = (extension: string, fileName?: string): string => {
  const targetName = fileName || `file.${extension}`;
  const ext = targetName.toLowerCase().includes('.') 
    ? '.' + targetName.split('.').pop() 
    : '';
  
  const baseName = targetName.toLowerCase();

  // Special files
  if (baseName === 'package.json') return '📦';
  if (baseName === 'tsconfig.json' || baseName === 'jsconfig.json') return '⚙️';
  if (baseName === 'dockerfile' || baseName.includes('docker')) return '🐳';
  if (baseName === 'readme.md' || baseName === 'readme.txt') return '📋';

  // Extension-based mapping (simplified emoji icons for compatibility)
  switch (ext) {
    case '.js':
    case '.mjs':
      return '🟨'; // JavaScript - Yellow square

    case '.ts':
      return '🔵'; // TypeScript - Blue circle

    case '.tsx':
    case '.jsx':
      return '⚛️'; // React - Atom symbol

    case '.html':
    case '.htm':
      return '🌐'; // HTML - Globe

    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      return '🎨'; // CSS - Artist palette

    case '.json':
      return '📄'; // JSON - Document

    case '.py':
      return '🐍'; // Python - Snake

    case '.rs':
      return '🦀'; // Rust - Crab

    case '.go':
      return '🐹'; // Go - Gopher

    case '.java':
      return '☕'; // Java - Coffee

    case '.md':
    case '.markdown':
      return '📝'; // Markdown - Memo

    case '.xml':
    case '.svg':
      return '🔖'; // XML/SVG - Bookmark

    case '.yml':
    case '.yaml':
      return '⚙️'; // YAML - Gear

    case '.toml':
      return '🔧'; // TOML - Wrench

    case '.php':
      return '🐘'; // PHP - Elephant

    case '.vue':
      return '💚'; // Vue - Green heart

    case '.rb':
      return '💎'; // Ruby - Gem

    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.ico':
      return '🖼️'; // Images - Picture frame

    default:
      return '📄'; // Default - Document
  }
}; 