// Monaco Editor optimization configuration for instant startup

// Configure Monaco to load faster with minimal initial features
export const configureMonaco = () => {
  // For now, let Monaco use its default configuration to avoid loader issues
  // The @monaco-editor/react package handles most optimizations automatically
  console.log('🚀 Monaco configuration initialized - using defaults for stability');
  
  // We'll add optimizations after Monaco loads successfully
  return true;
};

// Lightweight language detection for common file types
export const getLanguageFromPath = (filePath: string): string => {
  if (!filePath) return 'plaintext';
  
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  // Fast language mapping without heavy features
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript', 
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
  };

  return languageMap[extension || ''] || 'plaintext';
}; 